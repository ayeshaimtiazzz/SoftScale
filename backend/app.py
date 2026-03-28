"""Main FastAPI application."""
from fastapi import FastAPI
from contextlib import asynccontextmanager
from middleware import setup_cors
from routes import (
    auth_router,
    user_router,
    profile_router,
    job_router,
    talent_router,
    billing_router,
    api_router,
    proposal_router,
    deal_router,
    note_router,
    notification_router,
    sentiment_router,
    deal_conversation_router,
)
from config import settings
import uvicorn
import asyncio


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup and shutdown events."""
    print("[APP] Starting application (HTTP will bind next; AI models load in background)...", flush=True)

    def preload_models_sync():
        """Kick off AI model loads without blocking the API event loop."""
        try:
            print("[APP] Initiating background load for all AI modules...", flush=True)
            from services.proposal_generator_service import ProposalGeneratorService
            from services.sentiment_analysis_service import SentimentAnalysisService
            from ai.leads_match.service import TalentEmbeddingService

            # Sequential warmup to avoid resource contention and import/model-load races.
            ProposalGeneratorService()
            print("[APP] Proposal generator preload triggered.", flush=True)

            TalentEmbeddingService()
            print("[APP] Talent embedding model loaded.", flush=True)

            SentimentAnalysisService()._ensure_llm_loaded()
            print("[APP] Sentiment analysis LLM loaded.", flush=True)

            print(
                "[APP] All AI module preload tasks triggered/completed "
                "(watch for [MODEL]/[APP] lines; API is already usable).",
                flush=True,
            )
        except Exception as e:
            print(f"[APP] Error during AI module preload: {e}", flush=True)
            print("[APP] Model may load on first request instead.", flush=True)

    loop = asyncio.get_running_loop()
    if settings.SKIP_AI_WARMUP:
        print(
            "[APP] SKIP_AI_WARMUP=1 — skipping background AI warmup (set SKIP_AI_WARMUP=0 to enable).",
            flush=True,
        )
    else:
        loop.run_in_executor(None, preload_models_sync)

    yield

    print("[APP] Shutting down application...", flush=True)


# Create FastAPI app with lifespan
app = FastAPI(lifespan=lifespan)

# Setup CORS
setup_cors(app)

# Include routers
app.include_router(auth_router)
app.include_router(user_router)
app.include_router(profile_router)
app.include_router(job_router)
app.include_router(talent_router)
app.include_router(billing_router)
app.include_router(api_router)
app.include_router(proposal_router)
app.include_router(deal_router)
app.include_router(note_router)
app.include_router(notification_router)
app.include_router(sentiment_router)
app.include_router(deal_conversation_router)

@app.get("/")
def read_root():
    """Root endpoint."""
    return {"message": "Backend is running! Use /docs for API docs."}

@app.get("/api/routes")
def list_routes():
    """List all registered routes for debugging."""
    routes = []
    for route in app.routes:
        if hasattr(route, 'path') and hasattr(route, 'methods'):
            methods = [m for m in route.methods if m not in ['HEAD', 'OPTIONS']]
            if methods:
                routes.append({
                    'path': route.path,
                    'methods': methods,
                    'name': getattr(route, 'name', 'N/A')
                })
    return {"routes": sorted(routes, key=lambda x: x['path'])}

if __name__ == "__main__":
    uvicorn.run(app, host=settings.BACKEND_HOST, port=settings.BACKEND_PORT)
