from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="TuringArena Backend", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://turingarena.xyz"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "TuringArena Backend"}


# Routers registered as they are built
from app.routers import agent, market  # noqa: E402
app.include_router(agent.router, prefix="/agent", tags=["agent"])
app.include_router(market.router, prefix="/market", tags=["market"])
