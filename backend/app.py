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
    proposal_router
)
from config import settings
import uvicorn
import asyncio


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup and shutdown events."""
    # Startup: Preload models in background
    print("Starting application...")

    def preload_models_sync():
        """Preload models synchronously (runs in thread pool)."""
        try:
            print("Preloading proposal generator model in background...")
            from services.proposal_generator_service import ProposalGeneratorService
            # Initialize service (will load model)
            service = ProposalGeneratorService()
            if service.is_available():
                print("Proposal generator model preloaded successfully!")
            else:
                print("Proposal generator model not available (will use fallback)")
        except Exception as e:
            print(f"Error preloading proposal generator model: {e}")
            print("Model will be loaded on first request")

    # Start model loading in background thread (non-blocking)
    loop = asyncio.get_event_loop()
    loop.run_in_executor(None, preload_models_sync)

    yield

    # Shutdown: Cleanup if needed
    print("Shutting down application...")


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

@app.get("/")
def read_root():
    """Root endpoint."""
    return {"message": "Backend is running! Use /docs for API docs."}

if __name__ == "__main__":
    uvicorn.run(app, host=settings.BACKEND_HOST, port=settings.BACKEND_PORT)
