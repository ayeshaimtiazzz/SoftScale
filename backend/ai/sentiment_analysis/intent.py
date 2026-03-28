import torch
from pathlib import Path
from transformers import AutoTokenizer, AutoModelForSequenceClassification
from config import settings

# Load DistilBERT model from local directory (offline-friendly).
_BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = _BASE_DIR / "model" / "intent_model" / "distilbert"
tokenizer = AutoTokenizer.from_pretrained(
    str(MODEL_PATH),
    local_files_only=True,
    cache_dir=settings.HF_CACHE_DIR,
)
model = AutoModelForSequenceClassification.from_pretrained(
    str(MODEL_PATH),
    local_files_only=True,
    cache_dir=settings.HF_CACHE_DIR,
)

# Map label IDs to label names
id2label = model.config.id2label

import torch.nn.functional as F


def predict_intent_with_confidence(message: str):
    inputs = tokenizer(
        message,
        return_tensors="pt",
        truncation=True,
        padding=True,
    )

    with torch.no_grad():
        outputs = model(**inputs)

    logits = outputs.logits
    probs = F.softmax(logits, dim=1)

    confidence, pred_id = torch.max(probs, dim=1)

    intent = id2label[pred_id.item()]

    return intent, round(confidence.item(), 3)
