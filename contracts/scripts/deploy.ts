import hre from "hardhat";
const { ethers } = hre;

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  // Deploy TuringAgent8004
  const Agent = await ethers.getContractFactory("TuringAgent8004");
  const agent = await Agent.deploy();
  await agent.waitForDeployment();
  const agentAddr = await agent.getAddress();
  console.log("TuringAgent8004:", agentAddr);

  // Deploy CounterTradeEscrow with 1000 testnet MNT bankroll
  const bankrollMNT = ethers.parseEther("1000");
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
