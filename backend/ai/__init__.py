"""AI Models and Services Module.

This module contains all AI/ML models, LLMs, and embedding services.
All model services follow a consistent interface and use singleton pattern
for efficient resource management.

Structure:
    ai/
    ├── base.py                    # BaseModelService
    ├── leads_match/               # Leads matching model
    │   ├── service.py             # TalentEmbeddingService
    │   ├── datasets/              # Training data
    │   │   └── embeddings/        # Embeddings datasets
    │   └── model/                 # Model files
    └── proposal_generator/        # Proposal generation model
        ├── service.py             # ProposalGeneratorService
        ├── datasets/              # Training data
        └── model/                 # Model files
"""

from ai.base import BaseModelService
from ai.leads_match import TalentEmbeddingService
from services.proposal_generator_service import ProposalGeneratorService

__all__ = [
    "BaseModelService",
    "TalentEmbeddingService",
    "ProposalGeneratorService",
]

