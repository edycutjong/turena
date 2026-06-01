import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;

describe("CounterTradeEscrow Pari-Mutuel Model Wars", function () {
  async function deployEscrowFixture() {
    const [owner, bettor1, bettor2, bettor3] = await ethers.getSigners();
    const Escrow = await ethers.getContractFactory("CounterTradeEscrow");
    const escrow = await Escrow.deploy({ value: 0 }); // No bankroll needed
    return { escrow, owner, bettor1, bettor2, bettor3 };
  }

  it("should place bet on DeepSeek (Choice 1)", async function () {
    const { escrow, bettor1 } = await deployEscrowFixture();
    await expect(escrow.connect(bettor1).placeBet(1, 1, { value: 500 }))
      .to.emit(escrow, "BetPlaced")
      .withArgs(1, bettor1.address, 500, 1);
    
    const cycle = await escrow.cycles(1);
    expect(cycle.deepSeekPool).to.equal(500);
    expect(cycle.openAIPool).to.equal(0);
  });

  it("should place bet on OpenAI (Choice 2)", async function () {
    const { escrow, bettor1 } = await deployEscrowFixture();
    await expect(escrow.connect(bettor1).placeBet(1, 2, { value: 300 }))
      .to.emit(escrow, "BetPlaced")
      .withArgs(1, bettor1.address, 300, 2);

    const cycle = await escrow.cycles(1);
    expect(cycle.openAIPool).to.equal(300);
    expect(cycle.deepSeekPool).to.equal(0);
  });

  it("should reject a bet if bet amount is 0", async function () {
    const { escrow, bettor1 } = await deployEscrowFixture();
    await expect(
      escrow.connect(bettor1).placeBet(1, 1, { value: 0 })
    ).to.be.revertedWith("Bet must be > 0");
  });

  it("should reject a bet if cycle is already settled", async function () {
    const { escrow, owner, bettor1 } = await deployEscrowFixture();
    await escrow.connect(owner).settle(1, 1);
    await expect(
      escrow.connect(bettor1).placeBet(1, 1, { value: 100 })
    ).to.be.revertedWith("Cycle already settled");
  });

  it("should reject a bet if bettor already bet this cycle", async function () {
    const { escrow, bettor1 } = await deployEscrowFixture();
    await escrow.connect(bettor1).placeBet(1, 1, { value: 100 });
    await expect(
      escrow.connect(bettor1).placeBet(1, 2, { value: 100 })
    ).to.be.revertedWith("Already bet this cycle");
  });

  it("should reject a bet if agent choice is invalid", async function () {
    const { escrow, bettor1 } = await deployEscrowFixture();
    await expect(
      escrow.connect(bettor1).placeBet(1, 3, { value: 100 })
    ).to.be.revertedWith("Invalid agent choice");
  });

  it("should correctly handle DeepSeek win and claim payout", async function () {
    const { escrow, owner, bettor1, bettor2 } = await deployEscrowFixture();
    // Bettor 1 bets 500 on DeepSeek
    await escrow.connect(bettor1).placeBet(1, 1, { value: 500n });
    // Bettor 2 bets 500 on OpenAI
    await escrow.connect(bettor2).placeBet(1, 2, { value: 500n });
    
    // Settle: 1 (DeepSeek wins)
    await escrow.connect(owner).settle(1, 1);

    // Bettor 1 claims: 500 + 500 = 1000
    const initialBalance = await ethers.provider.getBalance(bettor1.address);
    const tx = await escrow.connect(bettor1).claim(1);
    const receipt = await tx.wait();
    if (!receipt) throw new Error("No receipt");
    const gasCost = receipt.gasUsed * receipt.gasPrice;

    const finalBalance = await ethers.provider.getBalance(bettor1.address);
    expect(finalBalance).to.equal(initialBalance + 1000n - gasCost);

    // Bettor 2 claims: gets 0 (reverts or just doesn't transfer, wait our code doesn't revert but it transfers 0 if payout is 0... actually our code does NOT transfer if payout is 0, just emits nothing or doesn't fail). Wait, let's see. If payout is 0, it doesn't transfer.
    // Let's just claim
    const initialBalance2 = await ethers.provider.getBalance(bettor2.address);
    const tx2 = await escrow.connect(bettor2).claim(1);
    const receipt2 = await tx2.wait();
    if (!receipt2) throw new Error("No receipt");
    const gasCost2 = receipt2.gasUsed * receipt2.gasPrice;

    const finalBalance2 = await ethers.provider.getBalance(bettor2.address);
    expect(finalBalance2).to.equal(initialBalance2 - gasCost2);
  });

  it("should handle proportional payout", async function () {
    const { escrow, owner, bettor1, bettor2, bettor3 } = await deployEscrowFixture();
    // Total DS Pool: 1000
    await escrow.connect(bettor1).placeBet(1, 1, { value: 200n });
    await escrow.connect(bettor2).placeBet(1, 1, { value: 800n });
    
    // Total OA Pool: 500
    await escrow.connect(bettor3).placeBet(1, 2, { value: 500n });

    await escrow.connect(owner).settle(1, 1);

    // Bettor 1 gets: 200 + (200 * 500) / 1000 = 200 + 100 = 300
    const initialBalance = await ethers.provider.getBalance(bettor1.address);
    const tx = await escrow.connect(bettor1).claim(1);
    const receipt = await tx.wait();
    if (!receipt) throw new Error("No receipt");
    const gasCost = receipt.gasUsed * receipt.gasPrice;
    
    const finalBalance = await ethers.provider.getBalance(bettor1.address);
    expect(finalBalance).to.equal(initialBalance + 300n - gasCost);

    // Bettor 2 gets: 800 + (800 * 500) / 1000 = 800 + 400 = 1200
    const initialBalance2 = await ethers.provider.getBalance(bettor2.address);
    const tx2 = await escrow.connect(bettor2).claim(1);
    const receipt2 = await tx2.wait();
    if (!receipt2) throw new Error("No receipt");
    const gasCost2 = receipt2.gasUsed * receipt2.gasPrice;

    const finalBalance2 = await ethers.provider.getBalance(bettor2.address);
    expect(finalBalance2).to.equal(initialBalance2 + 1200n - gasCost2);
  });

  it("should handle draw refund", async function () {
    const { escrow, owner, bettor1, bettor2 } = await deployEscrowFixture();
    await escrow.connect(bettor1).placeBet(1, 1, { value: 500n });
    await escrow.connect(bettor2).placeBet(1, 2, { value: 200n });

    // Settle Draw: 3
    await escrow.connect(owner).settle(1, 3);

    // Bettor 1 gets 500 back
    const initialBalance = await ethers.provider.getBalance(bettor1.address);
    const tx = await escrow.connect(bettor1).claim(1);
    const receipt = await tx.wait();
    if (!receipt) throw new Error("No receipt");
    const gasCost = receipt.gasUsed * receipt.gasPrice;
    const finalBalance = await ethers.provider.getBalance(bettor1.address);
    expect(finalBalance).to.equal(initialBalance + 500n - gasCost);

    // Bettor 2 gets 200 back
    const initialBalance2 = await ethers.provider.getBalance(bettor2.address);
    const tx2 = await escrow.connect(bettor2).claim(1);
    const receipt2 = await tx2.wait();
    if (!receipt2) throw new Error("No receipt");
    const gasCost2 = receipt2.gasUsed * receipt2.gasPrice;
    const finalBalance2 = await ethers.provider.getBalance(bettor2.address);
    expect(finalBalance2).to.equal(initialBalance2 + 200n - gasCost2);
  });

  it("should handle when no opposing bets were placed", async function () {
    const { escrow, owner, bettor1 } = await deployEscrowFixture();
    await escrow.connect(bettor1).placeBet(1, 1, { value: 500n });
    
    await escrow.connect(owner).settle(1, 1);

    // Bettor 1 gets 500 back (no losers to take from)
    const initialBalance = await ethers.provider.getBalance(bettor1.address);
    const tx = await escrow.connect(bettor1).claim(1);
    const receipt = await tx.wait();
    if (!receipt) throw new Error("No receipt");
    const gasCost = receipt.gasUsed * receipt.gasPrice;
    const finalBalance = await ethers.provider.getBalance(bettor1.address);
    expect(finalBalance).to.equal(initialBalance + 500n - gasCost);
  });

  it("should reject claiming twice", async function () {
    const { escrow, owner, bettor1 } = await deployEscrowFixture();
    await escrow.connect(bettor1).placeBet(1, 1, { value: 100 });
    await escrow.connect(owner).settle(1, 1);
    
    await escrow.connect(bettor1).claim(1);
    await expect(
      escrow.connect(bettor1).claim(1)
    ).to.be.revertedWith("No bet found or already claimed");
  });

  it("should reject claiming if cycle is not settled", async function () {
    const { escrow, bettor1 } = await deployEscrowFixture();
    await escrow.connect(bettor1).placeBet(1, 1, { value: 100 });
    await expect(
      escrow.connect(bettor1).claim(1)
    ).to.be.revertedWith("Cycle not settled");
  });

  it("should reject settling if called by a non-owner", async function () {
    const { escrow, bettor1 } = await deployEscrowFixture();
    await expect(
      escrow.connect(bettor1).settle(1, 1)
    ).to.be.revertedWithCustomError(escrow, "OwnableUnauthorizedAccount");
  });

  it("should reject settling a cycle that is already settled", async function () {
    const { escrow, owner } = await deployEscrowFixture();
    await escrow.connect(owner).settle(1, 1);
    await expect(
      escrow.connect(owner).settle(1, 1)
    ).to.be.revertedWith("Already settled");
  });

  it("should reject settling with an invalid winner", async function () {
    const { escrow, owner } = await deployEscrowFixture();
    await expect(
      escrow.connect(owner).settle(1, 4)
    ).to.be.revertedWith("Invalid winner status");
    await expect(
      escrow.connect(owner).settle(1, 0)
    ).to.be.revertedWith("Invalid winner status");
  });

  it("should correctly handle OpenAI win and claim payout", async function () {
    const { escrow, owner, bettor1, bettor2 } = await deployEscrowFixture();
    await escrow.connect(bettor1).placeBet(1, 1, { value: 500n });
    await escrow.connect(bettor2).placeBet(1, 2, { value: 500n });
    
    await escrow.connect(owner).settle(1, 2); // OpenAI wins

    // Bettor 2 claims: gets 1000
    const initialBalance2 = await ethers.provider.getBalance(bettor2.address);
    const tx2 = await escrow.connect(bettor2).claim(1);
    const receipt2 = await tx2.wait();
    if (!receipt2) throw new Error("No receipt");
    const gasCost2 = receipt2.gasUsed * receipt2.gasPrice;

    const finalBalance2 = await ethers.provider.getBalance(bettor2.address);
    expect(finalBalance2).to.equal(initialBalance2 + 1000n - gasCost2);
  });

  it("should handle OpenAI win when no opposing bets were placed", async function () {
    const { escrow, owner, bettor2 } = await deployEscrowFixture();
    await escrow.connect(bettor2).placeBet(1, 2, { value: 500n });
    
    await escrow.connect(owner).settle(1, 2); // OpenAI wins

    // Bettor 2 gets 500 back (no losers to take from)
    const initialBalance2 = await ethers.provider.getBalance(bettor2.address);
    const tx2 = await escrow.connect(bettor2).claim(1);
    const receipt2 = await tx2.wait();
    if (!receipt2) throw new Error("No receipt");
    const gasCost2 = receipt2.gasUsed * receipt2.gasPrice;
    
    const finalBalance2 = await ethers.provider.getBalance(bettor2.address);
    expect(finalBalance2).to.equal(initialBalance2 + 500n - gasCost2);
  });

  it("should prevent reentrancy and handle transfer failures via MockRevertingReceiver", async function () {
    const { escrow, owner, bettor1 } = await deployEscrowFixture();
    
    const MockRevertingReceiver = await ethers.getContractFactory("MockRevertingReceiver");
    const escrowAddress = await escrow.getAddress();
    const receiver = await MockRevertingReceiver.deploy(escrowAddress);
    const receiverAddress = await receiver.getAddress();

    // Have the receiver place a bet
    await receiver.connect(bettor1).placeBet(1, 1, { value: 1000n });
    
    // Settle the cycle so the receiver wins
    await escrow.connect(owner).settle(1, 1);

    // Test transfer failure (revert on receive)
    await receiver.setReenter(false, 1);
    await expect(
      receiver.connect(bettor1).claim(1)
    ).to.be.revertedWith("Transfer failed");

    // Test reentrancy attack
    await receiver.setReenter(true, 1);
    await expect(
      receiver.connect(bettor1).claim(1)
    ).to.be.revertedWith("Transfer failed");
  });
});
