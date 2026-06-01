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

  it("should deploy with 0 initial bankroll", async function () {
    const Escrow = await ethers.getContractFactory("CounterTradeEscrow");
    const escrow = await Escrow.deploy({ value: 0 });
    expect(await escrow.bankroll()).to.equal(0);
  });

  it("should handle direct ether transfers via receive", async function () {
    const { escrow, owner } = await deployEscrowFixture();
    
    await expect(
      owner.sendTransaction({
        to: await escrow.getAddress(),
        value: 200,
      })
    )
      .to.emit(escrow, "BankrollFunded")
      .withArgs(200, 1200);

    expect(await escrow.bankroll()).to.equal(1200);
  });

  it("should allow a bet if bankroll is sufficient", async function () {
    const { escrow, bettor1 } = await deployEscrowFixture();
    await expect(escrow.connect(bettor1).placeBet(1, false, { value: 500 }))
      .to.emit(escrow, "BetPlaced")
      .withArgs(1, bettor1.address, 500, false);
    
    const cycle = await escrow.cycles(1);
    expect(cycle.againstAI).to.equal(500);
  });

  it("should allow placing a bet for AI", async function () {
    const { escrow, bettor1 } = await deployEscrowFixture();
    await expect(escrow.connect(bettor1).placeBet(1, true, { value: 300 }))
      .to.emit(escrow, "BetPlaced")
      .withArgs(1, bettor1.address, 300, true);

    const cycle = await escrow.cycles(1);
    expect(cycle.forAI).to.equal(300);
  });

  it("should reject a bet if bet amount is 0", async function () {
    const { escrow, bettor1 } = await deployEscrowFixture();
    await expect(
      escrow.connect(bettor1).placeBet(1, false, { value: 0 })
    ).to.be.revertedWith("Bet must be > 0");
  });

  it("should reject a bet if cycle is already settled", async function () {
    const { escrow, owner, bettor1 } = await deployEscrowFixture();
    await escrow.connect(owner).settle(1, true);
    await expect(
      escrow.connect(bettor1).placeBet(1, false, { value: 100 })
    ).to.be.revertedWith("Cycle already settled");
  });

  it("should reject a bet if bettor already bet this cycle", async function () {
    const { escrow, bettor1 } = await deployEscrowFixture();
    await escrow.connect(bettor1).placeBet(1, false, { value: 100 });
    await expect(
      escrow.connect(bettor1).placeBet(1, false, { value: 100 })
    ).to.be.revertedWith("Already bet this cycle");
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
    expect(finalBalance).to.equal(initialBalance + 1000n - gasCost);
  });

  it("should collect bets for AI when human wins", async function () {
    const { escrow, owner, bettor1, bettor2 } = await deployEscrowFixture();
    await escrow.connect(bettor1).placeBet(1, false, { value: 400 });
    await escrow.connect(bettor2).placeBet(1, true, { value: 300 });

    // Settle with human win (AI loses)
    // total payout to againstAI = 400 * 2 = 800.
    // initial bankroll = 1000.
    // after settle: bankroll - 800 + forAI (300) = 500.
    await escrow.connect(owner).settle(1, false);
    expect(await escrow.bankroll()).to.equal(500);
  });

  it("should reject settling a cycle twice", async function () {
    const { escrow, owner } = await deployEscrowFixture();
    await escrow.connect(owner).settle(1, true);
    await expect(
      escrow.connect(owner).settle(1, true)
    ).to.be.revertedWith("Already settled");
  });

  it("should reject settling if bankroll is insufficient for payouts", async function () {
    const { escrow, owner, bettor1, bettor2 } = await deployEscrowFixture();
    // Bankroll is 1000.
    // Bettor 1 bets 500 (bankroll >= 500, ok).
    // Bettor 2 bets 600 (bankroll >= 600, ok).
    // Total against AI bets = 1100. Payout would be 2200.
    await escrow.connect(bettor1).placeBet(1, false, { value: 500 });
    await escrow.connect(bettor2).placeBet(1, false, { value: 600 });

    await expect(
      escrow.connect(owner).settle(1, false)
    ).to.be.revertedWith("Bankroll insolvent");
  });

  it("should reject claiming if cycle is not settled", async function () {
    const { escrow, bettor1 } = await deployEscrowFixture();
    await escrow.connect(bettor1).placeBet(1, false, { value: 100 });
    await expect(
      escrow.connect(bettor1).claim(1)
    ).to.be.revertedWith("Cycle not settled");
  });

  it("should reject claiming twice (no bet found)", async function () {
    const { escrow, owner, bettor1 } = await deployEscrowFixture();
    await escrow.connect(bettor1).placeBet(1, false, { value: 100 });
    await escrow.connect(owner).settle(1, false);
    
    await escrow.connect(bettor1).claim(1);
    await expect(
      escrow.connect(bettor1).claim(1)
    ).to.be.revertedWith("No bet found");
  });

  it("should handle claiming when payout is 0 (bettor bet for AI and human wins)", async function () {
    const { escrow, owner, bettor1 } = await deployEscrowFixture();
    // Bettor 1 bets for AI
    await escrow.connect(bettor1).placeBet(1, true, { value: 100 });
    // AI loses (human wins)
    await escrow.connect(owner).settle(1, false);

    // Claim should not transfer anything because payout is 0
    const initialBalance = await ethers.provider.getBalance(bettor1.address);
    const tx = await escrow.connect(bettor1).claim(1);
    const receipt = await tx.wait();
    const gasCost = receipt.gasUsed * receipt.gasPrice;

    const finalBalance = await ethers.provider.getBalance(bettor1.address);
    // Only gas should be deducted
    expect(finalBalance).to.equal(initialBalance - gasCost);
  });

  it("should handle claiming when payout is 0 (bettor bet against AI and AI wins)", async function () {
    const { escrow, owner, bettor1 } = await deployEscrowFixture();
    // Bettor 1 bets against AI
    await escrow.connect(bettor1).placeBet(1, false, { value: 100 });
    // AI wins
    await escrow.connect(owner).settle(1, true);

    // Claim should not transfer anything because payout is 0
    const initialBalance = await ethers.provider.getBalance(bettor1.address);
    const tx = await escrow.connect(bettor1).claim(1);
    const receipt = await tx.wait();
    const gasCost = receipt.gasUsed * receipt.gasPrice;

    const finalBalance = await ethers.provider.getBalance(bettor1.address);
    // Only gas should be deducted
    expect(finalBalance).to.equal(initialBalance - gasCost);
  });

  it("should fail to claim if ether transfer fails", async function () {
    const { escrow, owner } = await deployEscrowFixture();
    
    // Deploy malicious reverting bettor contract
    const MockRevertingReceiver = await ethers.getContractFactory("MockRevertingReceiver");
    const maliciousBettor = await MockRevertingReceiver.deploy(await escrow.getAddress());

    // Place bet against AI through mock contract
    await maliciousBettor.placeBet(1, false, { value: 100 });

    // Settle cycle with AI loss
    await escrow.connect(owner).settle(1, false);

    // Call claim and assert revert on transfer failure
    await expect(
      maliciousBettor.claim(1)
    ).to.be.revertedWith("Transfer failed");
  });

  it("should reject settling if called by a non-owner", async function () {
    const { escrow, bettor1 } = await deployEscrowFixture();
    await expect(
      escrow.connect(bettor1).settle(1, true)
    ).to.be.revertedWithCustomError(escrow, "OwnableUnauthorizedAccount");
  });

  it("should reject claiming if it reenters", async function () {
    const { escrow, owner } = await deployEscrowFixture();
    
    // Deploy malicious reverting bettor contract
    const MockRevertingReceiver = await ethers.getContractFactory("MockRevertingReceiver");
    const maliciousBettor = await MockRevertingReceiver.deploy(await escrow.getAddress());

    // Place bet against AI through mock contract
    await maliciousBettor.placeBet(1, false, { value: 100 });

    // Settle cycle with AI loss
    await escrow.connect(owner).settle(1, false);

    // Enable reentrancy in mock contract
    await maliciousBettor.setReenter(true, 1);

    // Call claim - it should revert because it attempts to re-enter
    await expect(
      maliciousBettor.claim(1)
    ).to.be.reverted; // Reverts due to ReentrancyGuard
  });
});

