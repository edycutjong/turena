import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;

describe("CounterTradeEscrow", function () {
  async function deployEscrowFixture() {
    const [owner, bettor1, bettor2] = await ethers.getSigners();
    const Escrow = await ethers.getContractFactory("CounterTradeEscrow");
    // Deploy with 1000 wei initial bankroll
    const escrow = await Escrow.deploy({ value: 1000 });
    return { escrow, owner, bettor1, bettor2 };
  }

  it("should deploy with initial bankroll", async function () {
    const { escrow } = await deployEscrowFixture();
    expect(await escrow.bankroll()).to.equal(1000);
  });

  it("should allow a bet if bankroll is sufficient", async function () {
    const { escrow, bettor1 } = await deployEscrowFixture();
    await expect(escrow.connect(bettor1).placeBet(1, false, { value: 500 }))
      .to.emit(escrow, "BetPlaced")
      .withArgs(1, bettor1.address, 500, false);
    
    const cycle = await escrow.cycles(1);
    expect(cycle.againstAI).to.equal(500);
  });

  it("should reject a bet if bankroll is insufficient", async function () {
    const { escrow, bettor1 } = await deployEscrowFixture();
    // Bankroll is 1000, so betting 1500 should fail because bankroll can't cover potential 2x payout
    await expect(
      escrow.connect(bettor1).placeBet(1, false, { value: 1500 })
    ).to.be.revertedWith("Bankroll too low to accept bet");
  });

  it("should correctly handle AI win and bankroll increase", async function () {
    const { escrow, owner, bettor1 } = await deployEscrowFixture();
    await escrow.connect(bettor1).placeBet(1, false, { value: 500 });
    
    // AI wins, settle
    await escrow.connect(owner).settle(1, true);
    
    // Bankroll should increase by 500 (bettor lost to AI)
    expect(await escrow.bankroll()).to.equal(1500);
  });

  it("should correctly handle human win and claim payout", async function () {
    const { escrow, owner, bettor1 } = await deployEscrowFixture();
    await escrow.connect(bettor1).placeBet(1, false, { value: 500 });
    
    // Human wins (AI loses), settle
    await escrow.connect(owner).settle(1, false);
    
    // Bankroll drops by payout (500 * 2 = 1000)
    expect(await escrow.bankroll()).to.equal(0);

    // Bettor claims
    const initialBalance = await ethers.provider.getBalance(bettor1.address);
    const tx = await escrow.connect(bettor1).claim(1);
    const receipt = await tx.wait();
    const gasCost = receipt.gasUsed * receipt.gasPrice;

    const finalBalance = await ethers.provider.getBalance(bettor1.address);
    // initialBalance + 1000 - gasCost == finalBalance
    expect(finalBalance).to.equal(initialBalance + 1000n - gasCost);
  });
});
