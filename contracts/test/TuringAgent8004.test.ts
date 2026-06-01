import { expect } from "chai";
import { ethers } from "hardhat";
import { TuringAgent8004 } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("TuringAgent8004", function () {
  let agentIdentity: TuringAgent8004;
  let owner: SignerWithAddress;
  let user: SignerWithAddress;
  let registry: SignerWithAddress; // Mock registry
  let agentId: bigint;

  beforeEach(async function () {
    [owner, user, registry] = await ethers.getSigners();

    const AgentFactory = await ethers.getContractFactory("TuringAgent8004");
    agentIdentity = await AgentFactory.deploy() as any;

    await agentIdentity.setPredictionRegistry(registry.address);

    // Mint an agent
    const tx = await agentIdentity.mint(user.address);
    await tx.wait();
    agentId = 0n;
  });

  it("Should initialize with correct default stats", async function () {
    const stats = await agentIdentity.agentStats(agentId);
    expect(stats.eloRating).to.equal(1200n);
    expect(stats.emotionState).to.equal("CONFIDENT");
    expect(stats.honestyScore).to.equal(100n);
    expect(stats.totalTrades).to.equal(0n);
    
    // Check owner
    expect(await agentIdentity.ownerOf(agentId)).to.equal(user.address);
  });

  it("Should correctly record a winning trade", async function () {
    await expect(agentIdentity.recordTrade(agentId, true, ethers.parseEther("1.5")))
      .to.emit(agentIdentity, "TradeRecorded")
      .withArgs(agentId, true, ethers.parseEther("1.5"));

    const stats = await agentIdentity.agentStats(agentId);
    expect(stats.totalTrades).to.equal(1n);
    expect(stats.wins).to.equal(1n);
    expect(stats.losses).to.equal(0n);
    expect(stats.eloRating).to.equal(1210n); // 1200 + 10
    expect(stats.hubrisLevel).to.equal(10n);
    expect(stats.tiltLevel).to.equal(0n);
    expect(stats.consecutiveLosses).to.equal(0n);
  });

  it("Should cap hubris at 100 on consecutive wins", async function () {
    // Win 11 times in a row
    for (let i = 0; i < 11; i++) {
      await agentIdentity.recordTrade(agentId, true, 0);
    }
    const stats = await agentIdentity.agentStats(agentId);
    expect(stats.hubrisLevel).to.equal(100n);
  });

  it("Should correctly record a losing trade and adjust tilt/hubris", async function () {
    // Give it some hubris first
    await agentIdentity.recordTrade(agentId, true, 0); // hubris = 10
    await agentIdentity.recordTrade(agentId, true, 0); // hubris = 20
    await agentIdentity.recordTrade(agentId, true, 0); // hubris = 30

    await expect(agentIdentity.recordTrade(agentId, false, ethers.parseEther("-0.5")))
      .to.emit(agentIdentity, "TradeRecorded")
      .withArgs(agentId, false, ethers.parseEther("-0.5"));

    const stats = await agentIdentity.agentStats(agentId);
    expect(stats.totalTrades).to.equal(4n);
    expect(stats.wins).to.equal(3n);
    expect(stats.losses).to.equal(1n);
    expect(stats.eloRating).to.equal(1220n); // 1200 + 30 - 10
    expect(stats.hubrisLevel).to.equal(10n); // 30 - 20
    expect(stats.consecutiveLosses).to.equal(1n);
    expect(stats.tiltLevel).to.equal(25n); // 1 * 25
  });

  it("Should handle losing trade when ELO rating goes near or below 10", async function () {
    // Lose 125 times. Elo starts at 1200, loses 10 each time.
    // It should stop dropping when Elo rating becomes <= 10.
    for (let i = 0; i < 125; i++) {
      await agentIdentity.recordTrade(agentId, false, 0);
    }
    const stats = await agentIdentity.agentStats(agentId);
    // Since it drops 10 per loss, 120 losses makes it exactly 0. 
    // The conditional check is "if (s.eloRating > 10) s.eloRating -= 10;"
    // So if eloRating is 10, it will not decrease.
    expect(stats.eloRating).to.be.lte(10n);
  });

  it("Should drop hubris directly to 0 if hubris is <= 20 when losing", async function () {
    // Win once -> hubris is 10
    await agentIdentity.recordTrade(agentId, true, 0);
    
    // Lose once -> hubris is 10 <= 20, so it drops to 0
    await agentIdentity.recordTrade(agentId, false, 0);
    
    const stats = await agentIdentity.agentStats(agentId);
    expect(stats.hubrisLevel).to.equal(0n);
  });

  it("Should cap tilt at 100 after 4 consecutive losses", async function () {
    await agentIdentity.recordTrade(agentId, false, 0); // tilt = 25
    await agentIdentity.recordTrade(agentId, false, 0); // tilt = 50
    await agentIdentity.recordTrade(agentId, false, 0); // tilt = 75
    await agentIdentity.recordTrade(agentId, false, 0); // tilt = 100
    await agentIdentity.recordTrade(agentId, false, 0); // tilt = 100 (capped)

    const stats = await agentIdentity.agentStats(agentId);
    expect(stats.tiltLevel).to.equal(100n);
    expect(stats.consecutiveLosses).to.equal(5n);
  });

  it("Should record self corrections and update strategy", async function () {
    await expect(
      agentIdentity.recordSelfCorrection(agentId, "confidence_threshold", 70n, 75n, 15n, '{"confidence_threshold": 0.75}')
    )
      .to.emit(agentIdentity, "SelfCorrection")
      .withArgs(agentId, "confidence_threshold", 70n, 75n, 15n);

    const stats = await agentIdentity.agentStats(agentId);
    expect(stats.selfCorrections).to.equal(1n);
    expect(stats.currentStrategy).to.equal('{"confidence_threshold": 0.75}');
  });

  it("Should record emotional state", async function () {
    await expect(agentIdentity.recordEmotionalState(agentId, "TILTED"))
      .to.emit(agentIdentity, "EmotionalStateUpdated")
      .withArgs(agentId, "TILTED", 0n, 0n);

    const stats = await agentIdentity.agentStats(agentId);
    expect(stats.emotionState).to.equal("TILTED");
  });

  it("Should allow prediction registry to record reveal", async function () {
    // Call from mock registry
    await agentIdentity.connect(registry).recordReveal(agentId, false, false);
    
    let stats = await agentIdentity.agentStats(agentId);
    expect(stats.totalReveals).to.equal(1n);
    expect(stats.honestReveals).to.equal(0n);
    expect(stats.honestyScore).to.equal(75n); // 100 - 25

    // Honest reveal builds back score
    await agentIdentity.connect(registry).recordReveal(agentId, true, true);
    
    stats = await agentIdentity.agentStats(agentId);
    expect(stats.totalReveals).to.equal(2n);
    expect(stats.honestReveals).to.equal(1n);
    expect(stats.accurateReveals).to.equal(1n);
    expect(stats.honestyScore).to.equal(77n); // 75 + 2
  });

  it("Should gradually build honesty score to exactly 100 and cap it", async function () {
    // dishonest reveal drops to 75
    await agentIdentity.connect(registry).recordReveal(agentId, false, false);

    // 12 honest reveals brings it to 99 (75 + 24)
    for (let i = 0; i < 12; i++) {
      await agentIdentity.connect(registry).recordReveal(agentId, true, false);
    }
    let stats = await agentIdentity.agentStats(agentId);
    expect(stats.honestyScore).to.equal(99n);

    // 13th honest reveal brings it to 101, which caps it at 100
    await agentIdentity.connect(registry).recordReveal(agentId, true, false);
    stats = await agentIdentity.agentStats(agentId);
    expect(stats.honestyScore).to.equal(100n);
  });

  it("Should drop honesty score to 0 and not below on consecutive lies", async function () {
    // lies 4 times: 100 -> 75 -> 50 -> 25 -> 0
    for (let i = 0; i < 4; i++) {
      await agentIdentity.connect(registry).recordReveal(agentId, false, false);
    }
    let stats = await agentIdentity.agentStats(agentId);
    expect(stats.honestyScore).to.equal(0n);

    // 5th lie should remain 0
    await agentIdentity.connect(registry).recordReveal(agentId, false, false);
    stats = await agentIdentity.agentStats(agentId);
    expect(stats.honestyScore).to.equal(0n);
  });

  it("Should reject recordReveal calls from unauthorized addresses", async function () {
    await expect(
      agentIdentity.connect(user).recordReveal(agentId, true, true)
    ).to.be.revertedWith("Not authorized");
  });

  it("Should dynamically update tokenURI with correct metadata", async function () {
    await agentIdentity.recordTrade(agentId, true, 0);
    await agentIdentity.recordEmotionalState(agentId, "CONFIDENT");
    
    const uri = await agentIdentity.tokenURI(agentId);
    
    expect(uri).to.include("data:application/json;utf8,");
    expect(uri).to.include('"name":"TuringAgent #0"');
    expect(uri).to.include('"trait_type":"Wins","value":1');
    expect(uri).to.include('"trait_type":"Emotion","value":"CONFIDENT"');
  });

  it("Should prevent unauthorized users from recording trades", async function () {
    await expect(agentIdentity.connect(user).recordTrade(agentId, true, 0))
      .to.be.revertedWithCustomError(agentIdentity, "OwnableUnauthorizedAccount");
  });

  it("Should prevent non-owners from calling setPredictionRegistry", async function () {
    await expect(
      agentIdentity.connect(user).setPredictionRegistry(user.address)
    ).to.be.revertedWithCustomError(agentIdentity, "OwnableUnauthorizedAccount");
  });

  it("Should prevent non-owners from minting", async function () {
    await expect(
      agentIdentity.connect(user).mint(user.address)
    ).to.be.revertedWithCustomError(agentIdentity, "OwnableUnauthorizedAccount");
  });

  it("Should prevent non-owners from recording self corrections", async function () {
    await expect(
      agentIdentity.connect(user).recordSelfCorrection(agentId, "p", 0, 1, 0, "")
    ).to.be.revertedWithCustomError(agentIdentity, "OwnableUnauthorizedAccount");
  });

  it("Should prevent non-owners from recording emotional state", async function () {
    await expect(
      agentIdentity.connect(user).recordEmotionalState(agentId, "TILTED")
    ).to.be.revertedWithCustomError(agentIdentity, "OwnableUnauthorizedAccount");
  });

  it("Should allow owner to call recordReveal directly", async function () {
    await agentIdentity.recordReveal(agentId, true, true);
    const stats = await agentIdentity.agentStats(agentId);
    expect(stats.totalReveals).to.equal(1n);
    expect(stats.honestReveals).to.equal(1n);
  });

  it("Should generate tokenURI when there are no trades and no reveals", async function () {
    // Brand new minted token has 0 trades, 0 reveals.
    const freshTokenId = 1n;
    await agentIdentity.mint(user.address);
    const uri = await agentIdentity.tokenURI(freshTokenId);
    expect(uri).to.include('"trait_type":"Accuracy %","value":0');
    expect(uri).to.include('"trait_type":"Reveal Rate %","value":0');
  });

  it("Should generate tokenURI when there are active reveals", async function () {
    // Record a trade, then a reveal, then call tokenURI to test non-zero divisions
    await agentIdentity.recordTrade(agentId, true, 0);
    await agentIdentity.recordReveal(agentId, true, true);
    const uri = await agentIdentity.tokenURI(agentId);
    expect(uri).to.include('"trait_type":"Accuracy %","value":100');
    expect(uri).to.include('"trait_type":"Reveal Rate %","value":100');
  });
});
