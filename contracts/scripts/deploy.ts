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

  // Bankroll: 50 MNT on mainnet, 1000 MNT on testnet, overrideable via env
  const isMainnet = network.name === "mantleMainnet";
  const defaultBankroll = isMainnet ? "50" : "1000";
  const bankrollMNT = ethers.parseEther(
    process.env.DEPLOY_BANKROLL_MNT ?? defaultBankroll
  );
  console.log("Bankroll:      ", ethers.formatEther(bankrollMNT), "MNT");

  if (balance < bankrollMNT) {
    throw new Error(
      `Insufficient balance. Need at least ${ethers.formatEther(bankrollMNT)} MNT, have ${ethers.formatEther(balance)} MNT`
    );
  }

  // Deploy TuringAgent8004
  const Agent = await ethers.getContractFactory("TuringAgent8004");
  const agent = await Agent.deploy();
  await agent.waitForDeployment();
  const agentAddr = await agent.getAddress();
  console.log("TuringAgent8004:", agentAddr);

  // Deploy CounterTradeEscrow with initial bankroll
  const Escrow = await ethers.getContractFactory("CounterTradeEscrow");
  const escrow = await Escrow.deploy({ value: bankrollMNT });
  await escrow.waitForDeployment();
  const escrowAddr = await escrow.getAddress();
  console.log("CounterTradeEscrow:", escrowAddr);

  // Mint agent NFT token #0 to deployer
  const tx = await agent.mint(deployer.address);
  await tx.wait();
  console.log("Agent NFT minted — token ID: 0");

  console.log("\n--- Add to .env ---");
  console.log(`TURING_AGENT_ADDRESS=${agentAddr}`);
  console.log(`ESCROW_ADDRESS=${escrowAddr}`);
  console.log(`NEXT_PUBLIC_TURING_AGENT_ADDRESS=${agentAddr}`);
  console.log(`NEXT_PUBLIC_ESCROW_ADDRESS=${escrowAddr}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
