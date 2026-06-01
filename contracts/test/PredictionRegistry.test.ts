import { expect } from "chai";
import { ethers } from "hardhat";
import { TuringAgent8004, PredictionRegistry } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("PredictionRegistry (Mantle Mirror)", function () {
  let agentIdentity: TuringAgent8004;
  let registry: PredictionRegistry;
  let owner: SignerWithAddress;
  let user: SignerWithAddress;
  let agentId: bigint;

  beforeEach(async function () {
    [owner, user] = await ethers.getSigners();

    const AgentFactory = await ethers.getContractFactory("TuringAgent8004");
    agentIdentity = await AgentFactory.deploy() as any;

    const RegistryFactory = await ethers.getContractFactory("PredictionRegistry");
    registry = await RegistryFactory.deploy(await agentIdentity.getAddress()) as any;

    await agentIdentity.setPredictionRegistry(await registry.getAddress());

    // Mint an agent to user
    const tx = await agentIdentity.mint(user.address);
    await tx.wait();
    agentId = 0n; 
  });

  it("Should commit and reveal successfully, updating honesty score", async function () {
    const cycleId = 1n;
    const direction = "LONG";
    const confidence = 85n;
    const nonce = 12345n;
    
    // Hash the prediction (direction, confidence, nonce)
    const encoded = ethers.solidityPacked(
      ["string", "uint256", "uint256"], 
      [direction, confidence, nonce]
    );
    const commitHash = ethers.keccak256(encoded);

    // Commit
    await expect(registry.commit(cycleId, agentId, commitHash))
      .to.emit(registry, "Committed")
      .withArgs(cycleId, agentId, commitHash);

    // Initial honesty score should be 100
    let stats = await agentIdentity.agentStats(agentId);
    expect(stats.honestyScore).to.equal(100n);

    // Reveal
    await expect(registry.reveal(cycleId, agentId, direction, confidence, nonce, true))
      .to.emit(registry, "Revealed")
      .withArgs(cycleId, agentId, direction, confidence, nonce, true, true);

    stats = await agentIdentity.agentStats(agentId);
    expect(stats.honestyScore).to.equal(100n); // Remains 100 because honest reveal doesn't increase it above 100
    expect(stats.totalReveals).to.equal(1n);
    expect(stats.honestReveals).to.equal(1n);
    expect(stats.accurateReveals).to.equal(1n);
  });

  it("Should penalize honesty score on dishonest reveal", async function () {
    const cycleId = 2n;
    const direction = "LONG";
    const confidence = 85n;
    const nonce = 12345n;
    
    const encoded = ethers.solidityPacked(
      ["string", "uint256", "uint256"], 
      [direction, confidence, nonce]
    );
    const commitHash = ethers.keccak256(encoded);

    // Commit
    await registry.commit(cycleId, agentId, commitHash);

    // Reveal with incorrect values (dishonest)
    await registry.reveal(cycleId, agentId, "SHORT", confidence, nonce, false);

    const stats = await agentIdentity.agentStats(agentId);
    // Should lose 25 points for being dishonest
    expect(stats.honestyScore).to.equal(75n);
    expect(stats.totalReveals).to.equal(1n);
    expect(stats.honestReveals).to.equal(0n);
    expect(stats.accurateReveals).to.equal(0n);
  });

  it("Should reject commits from non-owners", async function () {
    const cycleId = 3n;
    const commitHash = ethers.keccak256(ethers.toUtf8Bytes("dummy"));
    await expect(
      registry.connect(user).commit(cycleId, agentId, commitHash)
    ).to.be.revertedWithCustomError(registry, "OwnableUnauthorizedAccount");
  });

  it("Should reject double commits", async function () {
    const cycleId = 4n;
    const commitHash1 = ethers.keccak256(ethers.toUtf8Bytes("first"));
    const commitHash2 = ethers.keccak256(ethers.toUtf8Bytes("second"));

    await registry.commit(cycleId, agentId, commitHash1);
    await expect(
      registry.commit(cycleId, agentId, commitHash2)
    ).to.be.revertedWith("Already committed");
  });

  it("Should reject reveals from non-owners", async function () {
    const cycleId = 5n;
    await expect(
      registry.connect(user).reveal(cycleId, agentId, "LONG", 50n, 123n, true)
    ).to.be.revertedWithCustomError(registry, "OwnableUnauthorizedAccount");
  });

  it("Should reject reveals when no commit exists", async function () {
    const cycleId = 6n;
    await expect(
      registry.reveal(cycleId, agentId, "LONG", 50n, 123n, true)
    ).to.be.revertedWith("No commit found");
  });

  it("Should reject double reveals", async function () {
    const cycleId = 7n;
    const direction = "SHORT";
    const confidence = 60n;
    const nonce = 54321n;
    
    const encoded = ethers.solidityPacked(
      ["string", "uint256", "uint256"], 
      [direction, confidence, nonce]
    );
    const commitHash = ethers.keccak256(encoded);

    await registry.commit(cycleId, agentId, commitHash);
    await registry.reveal(cycleId, agentId, direction, confidence, nonce, true);

    await expect(
      registry.reveal(cycleId, agentId, direction, confidence, nonce, true)
    ).to.be.revertedWith("Already revealed");
  });
});
