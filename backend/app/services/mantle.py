import os
import json
import asyncio
from web3 import AsyncWeb3
from web3.middleware import ExtraDataToPOAMiddleware
from web3.types import Nonce

_nonce: int | None = None
_nonce_lock = asyncio.Lock()


async def _next_nonce(w3: AsyncWeb3, address: str) -> Nonce:
    global _nonce
    async with _nonce_lock:
        checksummed = AsyncWeb3.to_checksum_address(address)
        on_chain = max(
            await w3.eth.get_transaction_count(checksummed, "latest"),
            await w3.eth.get_transaction_count(checksummed, "pending"),
        )
        if _nonce is None or on_chain > _nonce:
            _nonce = on_chain
        nonce = _nonce
        _nonce += 1
        return Nonce(nonce)

# Minimal ABIs — only functions we call
AGENT_ABI = json.loads('[{"inputs":[{"name":"tokenId","type":"uint256"},{"name":"win","type":"bool"},{"name":"pnl","type":"int256"}],"name":"recordTrade","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"name":"tokenId","type":"uint256"},{"name":"param","type":"string"},{"name":"oldVal","type":"uint256"},{"name":"newVal","type":"uint256"},{"name":"regretScore","type":"uint256"},{"name":"newStrategy","type":"string"}],"name":"recordSelfCorrection","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"name":"tokenId","type":"uint256"},{"name":"emotionState","type":"string"}],"name":"recordEmotionalState","outputs":[],"stateMutability":"nonpayable","type":"function"}]')
ESCROW_ABI = json.loads('[{"inputs":[{"name":"cycleId","type":"uint256"},{"name":"aiWon","type":"bool"}],"name":"settle","outputs":[],"stateMutability":"nonpayable","type":"function"}]')

registry_abi_path = os.path.join(os.path.dirname(__file__), "..", "..", "abi", "PredictionRegistry.json")
if os.path.exists(registry_abi_path):
    with open(registry_abi_path, "r") as f:
        PREDICTION_REGISTRY_ABI = json.load(f)
else:
    PREDICTION_REGISTRY_ABI = []


def get_w3() -> AsyncWeb3:
    # MANTLE_MAINNET_RPC_URL used in production; fall back to testnet for local dev.
    # Set MANTLE_MAINNET_RPC_URL to a premium Alchemy/NodeReal endpoint before the live stream.
    rpc = os.getenv("MANTLE_MAINNET_RPC_URL") or os.getenv("MANTLE_RPC_URL", "https://rpc.sepolia.mantle.xyz")
    w3 = AsyncWeb3(AsyncWeb3.AsyncHTTPProvider(rpc))
    w3.middleware_onion.inject(ExtraDataToPOAMiddleware, layer=0)
    return w3


def get_account(w3: AsyncWeb3):
    pk = os.environ["DEPLOYER_PRIVATE_KEY"]
    return w3.eth.account.from_key(pk)


async def record_trade(token_id: int, win: bool, pnl_wei: int) -> str:
    w3 = get_w3()
    account = get_account(w3)
    addr = AsyncWeb3.to_checksum_address(os.environ["TURING_AGENT_ADDRESS"])
    contract = w3.eth.contract(address=addr, abi=AGENT_ABI)
    tx = await contract.functions.recordTrade(token_id, win, pnl_wei).build_transaction({
        "from": account.address,
        "nonce": await _next_nonce(w3, account.address),
    })
    signed = account.sign_transaction(tx)
    tx_hash = await w3.eth.send_raw_transaction(signed.raw_transaction)
    return tx_hash.hex()


async def record_self_correction(
    token_id: int, param: str, old_val: int, new_val: int,
    regret_score: int, new_strategy: str
) -> str:
    w3 = get_w3()
    account = get_account(w3)
    addr = AsyncWeb3.to_checksum_address(os.environ["TURING_AGENT_ADDRESS"])
    contract = w3.eth.contract(address=addr, abi=AGENT_ABI)
    tx = await contract.functions.recordSelfCorrection(
        token_id, param, old_val, new_val, regret_score, new_strategy
    ).build_transaction({
        "from": account.address,
        "nonce": await _next_nonce(w3, account.address),
    })
    signed = account.sign_transaction(tx)
    tx_hash = await w3.eth.send_raw_transaction(signed.raw_transaction)
    return tx_hash.hex()


async def record_emotional_state(token_id: int, emotion_state: str) -> str:
    w3 = get_w3()
    account = get_account(w3)
    addr = AsyncWeb3.to_checksum_address(os.environ["TURING_AGENT_ADDRESS"])
    contract = w3.eth.contract(address=addr, abi=AGENT_ABI)
    tx = await contract.functions.recordEmotionalState(token_id, emotion_state).build_transaction({
        "from": account.address,
        "nonce": await _next_nonce(w3, account.address),
    })
    signed = account.sign_transaction(tx)
    tx_hash = await w3.eth.send_raw_transaction(signed.raw_transaction)
    return tx_hash.hex()


async def settle_cycle(cycle_id: int, ai_won: bool) -> str:
    w3 = get_w3()
    account = get_account(w3)
    addr = AsyncWeb3.to_checksum_address(os.environ["ESCROW_ADDRESS"])
    contract = w3.eth.contract(address=addr, abi=ESCROW_ABI)
    tx = await contract.functions.settle(cycle_id, ai_won).build_transaction({
        "from": account.address,
        "nonce": await _next_nonce(w3, account.address),
    })
    signed = account.sign_transaction(tx)
    tx_hash = await w3.eth.send_raw_transaction(signed.raw_transaction)
    return tx_hash.hex()


async def commit_prediction(cycle_id: int, agent_id: int, direction: str, confidence: int, nonce: int) -> str:
    w3 = get_w3()
    account = get_account(w3)
    addr = AsyncWeb3.to_checksum_address(os.environ["PREDICTION_REGISTRY_ADDRESS"])
    contract = w3.eth.contract(address=addr, abi=PREDICTION_REGISTRY_ABI)
    
    # Generate hash exactly as Solidity does: keccak256(abi.encodePacked(direction, confidence, nonce))
    commit_hash = w3.solidity_keccak(['string', 'uint256', 'uint256'], [direction, confidence, nonce])
    
    tx = await contract.functions.commit(cycle_id, agent_id, commit_hash).build_transaction({
        "from": account.address,
        "nonce": await _next_nonce(w3, account.address),
    })
    signed = account.sign_transaction(tx)
    tx_hash = await w3.eth.send_raw_transaction(signed.raw_transaction)
    return tx_hash.hex()


async def reveal_prediction(cycle_id: int, agent_id: int, direction: str, confidence: int, nonce: int, was_profitable: bool) -> str:
    w3 = get_w3()
    account = get_account(w3)
    addr = AsyncWeb3.to_checksum_address(os.environ["PREDICTION_REGISTRY_ADDRESS"])
    contract = w3.eth.contract(address=addr, abi=PREDICTION_REGISTRY_ABI)
    
    tx = await contract.functions.reveal(
        cycle_id, agent_id, direction, confidence, nonce, was_profitable
    ).build_transaction({
        "from": account.address,
        "nonce": await _next_nonce(w3, account.address),
    })
    signed = account.sign_transaction(tx)
    tx_hash = await w3.eth.send_raw_transaction(signed.raw_transaction)
    return tx_hash.hex()
