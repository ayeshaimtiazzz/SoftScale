"""Main FastAPI application."""
from fastapi import FastAPI
from middleware import setup_cors
from routes import (
    auth_router,
    user_router,
    profile_router,
    job_router,
    talent_router,
    billing_router,
    api_router,
    deal_router
)
from config import settings
import uvicorn

# Create FastAPI app
app = FastAPI()

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
app.include_router(deal_router)

@app.get("/")
def read_root():
    """Root endpoint."""
    return {"message": "Backend is running! Use /docs for API docs."}

if __name__ == "__main__":
    uvicorn.run(app, host=settings.BACKEND_HOST, port=settings.BACKEND_PORT)
