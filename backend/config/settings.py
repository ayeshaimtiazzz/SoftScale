"""Application settings and configuration."""
import os
from dotenv import load_dotenv

# Load environment variables
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROJECT_ROOT = os.path.dirname(BASE_DIR)
load_dotenv(os.path.join(PROJECT_ROOT, ".env"))
load_dotenv()

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

    # Embedding Model Configuration (for talent matching)
    EMBED_MODEL_NAME = "all-MiniLM-L6-v2"
    EMBEDDINGS_DIR_NAME = "ai/leads_match/datasets/embeddings"
    EMBEDDINGS_DIR = os.path.join(BASE_DIR, EMBEDDINGS_DIR_NAME)

    # Proposal Generator Model Configuration
    PROPOSAL_BASE_MODEL_NAME = "unsloth/Llama-3.2-3B-Instruct"
    # Path to PEFT adapter (your trained model)
    # Using the 'tuned' model version (updated/final version)
    PROPOSAL_MODEL_PATH = os.path.join(
        BASE_DIR,
        "ai",
        "proposal_generator",
        "model",
        "tuned"
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

    # Proposal Generator Configuration
    # Set to False to disable model and use fallback only (prevents blocking)
    ENABLE_PROPOSAL_MODEL = os.getenv("ENABLE_PROPOSAL_MODEL", "true").lower() == "true"
    # Use 8-bit quantization for faster loading and less memory (optional)
    USE_QUANTIZATION = os.getenv("USE_QUANTIZATION", "false").lower() == "true"

    # Server Configuration
    BACKEND_HOST = os.getenv("BACKEND_HOST", "0.0.0.0")
    BACKEND_PORT = int(os.getenv("BACKEND_PORT", "8000"))

    @property
    def cors_origins_list(self):
        """Parse CORS origins into a list."""
        if self.CORS_ORIGINS == "*":
            return ["*"]
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]

    @property
    def db_config(self):
        """Get database configuration as dict."""
        return {
            "dbname": self.DB_NAME,
            "user": self.DB_USER,
            "password": self.DB_PASSWORD,
            "host": self.DB_HOST,
            "port": self.DB_PORT
        }

