import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

_auto_cycle_task: asyncio.Task | None = None


async def _auto_cycle_loop():
    """Continuously run trade cycles with a short pause between them."""
    from app.services.trade_loop import run_cycle
    while True:
        try:
            await run_cycle()
        except Exception as e:
            print(f"[auto-cycle] error: {e}")
        await asyncio.sleep(10)  # brief pause between cycles


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Auto-cycle starts only if AUTO_CYCLE=true env var is set
    import os
    global _auto_cycle_task
    if os.getenv("AUTO_CYCLE", "false").lower() == "true":
        _auto_cycle_task = asyncio.create_task(_auto_cycle_loop())
        print("[auto-cycle] started")
    yield
    if _auto_cycle_task:
        _auto_cycle_task.cancel()


app = FastAPI(title="Turena Backend", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://turena.xyz"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "Turena Backend"}


@app.post("/agent/run-cycle")
async def run_cycle_manual():
    """Manually trigger one full trade cycle (for demo / dev)."""
    from app.services.trade_loop import run_cycle
    import asyncio
    asyncio.create_task(run_cycle(manual=True))
    return {"status": "cycle started"}


from app.routers import agent, market  # noqa: E402
app.include_router(agent.router, prefix="/agent", tags=["agent"])
app.include_router(market.router, prefix="/market", tags=["market"])
