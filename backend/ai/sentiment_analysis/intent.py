import torch
from pathlib import Path
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import torch.nn.functional as F

# Load saved DistilBERT model (path relative to this file)
_BASE_DIR = Path(__file__).resolve().parent
# Folder layout (no "experiments" in between):
# backend/ai/sentiment_analysis/intent_model/distilbert/...
MODEL_PATH = _BASE_DIR / "intent_model" / "distilbert"
tokenizer = AutoTokenizer.from_pretrained(str(MODEL_PATH))
model = AutoModelForSequenceClassification.from_pretrained(str(MODEL_PATH))

# Map label IDs to label names
id2label = model.config.id2label


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

