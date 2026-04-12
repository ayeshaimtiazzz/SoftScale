"""Application settings and configuration."""
import os
from dotenv import load_dotenv

# Load environment variables
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROJECT_ROOT = os.path.dirname(BASE_DIR)
load_dotenv(os.path.join(PROJECT_ROOT, ".env"))
load_dotenv()


def _env_bool(name: str, default: bool = False) -> bool:
    """Parse common truthy env flag variants."""
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}

class Settings:
    """Application settings."""

    # Database Configuration
    DB_NAME = os.getenv("DB_NAME")
    DB_USER = os.getenv("DB_USER")
    DB_PASSWORD = os.getenv("DB_PASSWORD")
    DB_HOST = os.getenv("DB_HOST")
    DB_PORT = os.getenv("DB_PORT")

    # JWT Configuration
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
    JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("JWT_ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
    JWT_REFRESH_TOKEN_EXPIRE_HOURS = int(os.getenv("JWT_REFRESH_TOKEN_EXPIRE_HOURS", "24"))
    JWT_IDLE_TIMEOUT_HOURS = int(os.getenv("JWT_IDLE_TIMEOUT_HOURS", "8"))

    # CORS Configuration
    CORS_ORIGINS = os.getenv("CORS_ORIGINS", "*")

    # ======================
    # AI/ML Models Configuration
    # ======================

    # Persistent model caches (shared across runs/setups in this repo)
    MODEL_CACHE_ROOT = os.path.join(BASE_DIR, ".cache")
    HF_CACHE_DIR = os.path.join(MODEL_CACHE_ROOT, "huggingface")
    TORCH_CACHE_DIR = os.path.join(MODEL_CACHE_ROOT, "torch")
    SENTENCE_TRANSFORMERS_CACHE_DIR = os.path.join(MODEL_CACHE_ROOT, "sentence_transformers")

    # Embedding Model Configuration (for talent matching)
    EMBED_MODEL_NAME = "all-MiniLM-L6-v2"
    EMBED_MODEL_PATH = os.getenv(
        "EMBED_MODEL_PATH",
        os.path.join(
            SENTENCE_TRANSFORMERS_CACHE_DIR,
            "models--sentence-transformers--all-MiniLM-L6-v2",
        ),
    )
    EMBEDDINGS_DIR_NAME = "ai/leads_match/datasets/embeddings"
    EMBEDDINGS_DIR = os.path.join(BASE_DIR, EMBEDDINGS_DIR_NAME)

    # Proposal Generator Model Configuration
    PROPOSAL_BASE_MODEL_NAME = "unsloth/Llama-3.2-3B-Instruct"
    # Path to PEFT adapter (tuned model)
    PROPOSAL_MODEL_PATH = os.path.join(
        BASE_DIR,
        "ai",
        "proposal_generator",
        "model",
        "tuned"
    )
    # Path to merged model (base + adapter merged for faster loading)
    PROPOSAL_MERGED_MODEL_PATH = os.path.join(
        BASE_DIR,
        "ai",
        "proposal_generator",
        "model",
        "merged"
    )
    # Path to base model (if stored locally, otherwise downloads from HuggingFace)
    PROPOSAL_BASE_MODEL_PATH = os.path.join(
        BASE_DIR,
        "ai",
        "proposal_generator",
        "base_model"
    )
    PROPOSAL_DATASETS_DIR = os.path.join(
        BASE_DIR,
        "ai",
        "proposal_generator",
        "datasets"
    )
    PROPOSAL_TEMPLATES_DIR = os.path.join(
        BASE_DIR,
        "ai",
        "proposal_generator",
        "datasets",
        "proposals"
    )
    PROPOSAL_TRAINING_DIR = os.path.join(
        BASE_DIR,
        "ai",
        "proposal_generator",
        "datasets",
        "trainings"
    )

    # Model Loading Configuration
    USE_GPU = os.getenv("USE_GPU", "auto").lower() == "auto" or os.getenv("USE_GPU", "false").lower() == "true"

    # Skip loading all AI models in app lifespan (fast dev startup; models load on first request)
    SKIP_AI_WARMUP = _env_bool("SKIP_AI_WARMUP", default=False)

    # Proposal Generator Configuration
    # Set to False to disable model and use fallback only (prevents blocking)
    ENABLE_PROPOSAL_MODEL = os.getenv("ENABLE_PROPOSAL_MODEL", "true").lower() == "true"
    # Use 8-bit quantization for faster loading and less memory (optional)
    USE_QUANTIZATION = os.getenv("USE_QUANTIZATION", "false").lower() == "true"

    # Server Configuration
    BACKEND_HOST = os.getenv("BACKEND_HOST", "0.0.0.0")
    BACKEND_PORT = int(os.getenv("BACKEND_PORT", "8000"))

    # Seconds; fail fast if DB host/port is wrong (avoids indefinite hangs)
    DB_CONNECT_TIMEOUT = int(os.getenv("DB_CONNECT_TIMEOUT", "10"))

    # Sentiment analysis: fast mode by default to reduce latency.
    _sentiment_fast = os.getenv("SENTIMENT_FAST_MODE", "true").lower() == "true"
    SENTIMENT_FAST_MODE = _sentiment_fast
    # Cap message length sent to sentiment LLM steps (summary/key-signals/reply/report).
    SENTIMENT_LLM_INPUT_MAX_CHARS = int(
        os.getenv("SENTIMENT_LLM_INPUT_MAX_CHARS", "900" if _sentiment_fast else "2200")
    )
    SENTIMENT_KEY_SIGNALS_MAX_TOKENS = int(
        os.getenv("SENTIMENT_KEY_SIGNALS_MAX_TOKENS", "48" if _sentiment_fast else "120")
    )
    SENTIMENT_SUMMARY_MAX_TOKENS = int(
        os.getenv("SENTIMENT_SUMMARY_MAX_TOKENS", "64" if _sentiment_fast else "160")
    )
    SENTIMENT_REPLY_MAX_TOKENS = int(
        os.getenv("SENTIMENT_REPLY_MAX_TOKENS", "72" if _sentiment_fast else "180")
    )
    # 0 = build the long report from structured fields only (no extra LLM pass). >0 runs the Llama report prompt.
    SENTIMENT_REPORT_LLM_MAX_TOKENS = int(
        os.getenv("SENTIMENT_REPORT_LLM_MAX_TOKENS", "0" if _sentiment_fast else "450")
    )
    # Run DistilBERT sentiment + intent classifiers concurrently (separate models; watch GPU memory).
    SENTIMENT_PARALLEL_CLASSIFIERS = (
        os.getenv("SENTIMENT_PARALLEL_CLASSIFIERS", "true").lower() == "true"
    )
    # In-process LRU-style cache for identical cleaned message text (speed + buffering for repeat content).
    SENTIMENT_RESULT_CACHE_ENABLED = (
        os.getenv("SENTIMENT_RESULT_CACHE_ENABLED", "true").lower() == "true"
    )
    SENTIMENT_RESULT_CACHE_TTL_SECONDS = float(
        os.getenv("SENTIMENT_RESULT_CACHE_TTL_SECONDS", "3600")
    )

    @property
    def cors_origins_list(self):
        """Parse CORS origins into a list."""
        if self.CORS_ORIGINS == "*":
            return ["*"]
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]

    @property
    def db_config(self):
        """Get database configuration as dict."""
        cfg = {
            "dbname": self.DB_NAME,
            "user": self.DB_USER,
            "password": self.DB_PASSWORD,
            "host": self.DB_HOST,
            "port": self.DB_PORT,
            "connect_timeout": self.DB_CONNECT_TIMEOUT,
        }
        return cfg

