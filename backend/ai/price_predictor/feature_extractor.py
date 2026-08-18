"""NLP-style keyword extraction from project descriptions + merge with structured features."""

from typing import List, Optional

from .constants import ALL_FEATURES, USER_FEATURE_ALIASES

SYNONYMS = {
    "login": ["login", "sign in", "signin", "authentication"],
    "dashboard": ["dashboard", "admin dashboard", "panel"],
    "ai chatbot": ["chatbot", "ai chatbot", "assistant", "bot"],
    "api integration": ["api", "integration", "rest api"],
    "payment integration": ["payment", "stripe", "checkout"],
    "admin panel": ["admin panel", "admin"],
    "database setup": ["database", "db", "storage"],
}


def extract_features(description: str) -> List[str]:
    if not description or not str(description).strip():
        return []
    description = str(description).lower()
    extracted = []
    for feature, keywords in SYNONYMS.items():
        for word in keywords:
            if word in description:
                extracted.append(feature)
                break
    return list(dict.fromkeys(extracted))


def normalize_user_features(raw: Optional[List[str]]) -> List[str]:
    if not raw:
        return []
    out = []
    for item in raw:
        if item is None:
            continue
        key = str(item).strip().lower()
        if not key:
            continue
        canonical = USER_FEATURE_ALIASES.get(key, key)
        if canonical in ALL_FEATURES and canonical not in out:
            out.append(canonical)
    return out


def merge_description_and_user_features(description: str, user_features: Optional[List[str]]) -> List[str]:
    from_text = extract_features(description)
    from_user = normalize_user_features(user_features)
    merged = list(dict.fromkeys(from_text + from_user))
    return merged


def infer_fallback_features(description: str) -> List[str]:
    """
    Infer minimal viable features for sparse business text (common in deal descriptions).
    Keeps behavior deterministic and bounded to known ALL_FEATURES.
    """
    text = str(description or "").lower()
    guessed: List[str] = []

    def add(feature: str) -> None:
        if feature in ALL_FEATURES and feature not in guessed:
            guessed.append(feature)

    # Keyword buckets for weakly-structured scope statements.
    if any(k in text for k in ["auth", "login", "signin", "sign in", "user account"]):
        add("login")
    if any(k in text for k in ["dashboard", "analytics", "reporting", "admin view"]):
        add("dashboard")
    if any(k in text for k in ["api", "backend", "integration", "webhook"]):
        add("api integration")
    if any(k in text for k in ["payment", "stripe", "checkout", "invoice", "billing"]):
        add("payment integration")
    if any(k in text for k in ["chatbot", "assistant", "ai", "llm"]):
        add("ai chatbot")
    if any(k in text for k in ["admin panel", "admin", "management portal"]):
        add("admin panel")
    if any(k in text for k in ["database", "db", "postgres", "mysql", "storage"]):
        add("database setup")

    # Last-resort defaults for generic product scope text.
    if not guessed and text.strip():
        add("dashboard")
        add("database setup")

    return guessed


def detect_domain(features: List[str]) -> List[str]:
    domain = set()
    for f in features:
        if "ai" in f:
            domain.add("ai")
        elif "mobile" in f:
            domain.add("mobile")
        else:
            domain.add("web")
    return list(domain)


def estimate_complexity(features: List[str]) -> str:
    count = len(features)
    if count <= 2:
        return "simple"
    if count <= 5:
        return "medium"
    return "complex"


def calculate_hours(features: List[str]) -> int:
    from .features_hours import feature_hours

    total = 0
    for f in features:
        total += feature_hours.get(f, 0)
    return max(total, 1)
