import hre from "hardhat";
const { ethers, network } = hre;

async function main() {
  const signers = await ethers.getSigners();
  if (!signers.length) {
    throw new Error(
      "No deployer account found. Set DEPLOYER_PRIVATE_KEY in backend/.env"
    );
  }
  const deployer = signers[0];
  console.log("Network:       ", network.name);
  console.log("Deploying with:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Wallet balance:", ethers.formatEther(balance), "MNT");

  // Deploy TuringAgent8004
  const Agent = await ethers.getContractFactory("TuringAgent8004");
  const agent = await Agent.deploy();
  await agent.waitForDeployment();
  const agentAddr = await agent.getAddress();
  console.log("TuringAgent8004:", agentAddr);

  // Deploy CounterTradeEscrow (No initial bankroll needed for Pari-Mutuel)
  const Escrow = await ethers.getContractFactory("CounterTradeEscrow");
  const escrow = await Escrow.deploy({ value: 0 });
  await escrow.waitForDeployment();
  const escrowAddr = await escrow.getAddress();
  console.log("CounterTradeEscrow:", escrowAddr);

  // Deploy PredictionRegistry (Mantle Mirror Engine V2)
  const Registry = await ethers.getContractFactory("PredictionRegistry");
  const registry = await Registry.deploy(agentAddr);
  await registry.waitForDeployment();
  const registryAddr = await registry.getAddress();
  console.log("PredictionRegistry:", registryAddr);

  // Mint agent NFT token #0 (DeepSeek) to deployer
  const tx1 = await agent.mint(deployer.address);
  await tx1.wait();
  console.log("Agent NFT minted — token ID: 0 (DeepSeek)");

  // Mint agent NFT token #1 (OpenAI) to deployer
  const tx2 = await agent.mint(deployer.address);
  await tx2.wait();
  console.log("Agent NFT minted — token ID: 1 (OpenAI)");

  console.log("\n--- Add to .env ---");
  console.log(`PREDICTION_REGISTRY_ADDRESS=${registryAddr}`);
  console.log(`TURING_AGENT_ADDRESS=${agentAddr}`);
  console.log(`ESCROW_ADDRESS=${escrowAddr}`);
  console.log(`NEXT_PUBLIC_PREDICTION_REGISTRY_ADDRESS=${registryAddr}`);
  console.log(`NEXT_PUBLIC_TURING_AGENT_ADDRESS=${agentAddr}`);
  console.log(`NEXT_PUBLIC_ESCROW_ADDRESS=${escrowAddr}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
