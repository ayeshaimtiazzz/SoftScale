# Intent → urgency mapping
INTENT_URGENCY_MAP = {
    "interview_invitation": "high",
    "availability_check": "medium",
    "clarification_request": "medium",
    "internal_review": "low",
    "negotiation_discussion": "high",
    "portfolio_request": "medium",
    "polite_rejection": "low",
    "soft_interest": "low",
    "stalling": "low",
    "strong_interest": "medium",
}

# Action keywords to adjust urgency if present in message
HIGH_URGENCY_KEYWORDS = [
    "urgent",
    "asap",
    "immediately",
    "important",
    "quick discussion",
    "schedule interview",
    "interview soon",
    "respond quickly",
    "priority",
    "deadline",
    "time-sensitive",
    "action required",
    "respond asap",
    "short notice",
    "prompt reply",
    "high priority",
]

MEDIUM_URGENCY_KEYWORDS = [
    "check",
    "review",
    "share",
    "provide",
    "clarify",
    "confirm",
    "availability",
    "details",
    "feedback",
    "next steps",
    "follow up",
    "consider",
    "evaluate",
    "let us know",
    "send info",
    "discussion",
    "question",
    "suggestion",
    "reply requested",
    "input needed",
]

LOW_URGENCY_KEYWORDS = [
    "update",
    "inform",
    "optional",
    "whenever",
    "later",
    "no rush",
    "just to let you know",
    "for your information",
    "whenever convenient",
    "take your time",
    "FYI",
    "not urgent",
]

# Mapping urgency to recommended response time
URGENCY_RESPONSE_TIME = {
    "high": "within 12 hours",
    "medium": "within 2-3 days",
    "low": "within 1 week",
}


def detect_urgency(message: str, intent: str | None = None):
    """
    Detect urgency based on intent label and message keywords.
    Returns:
    {
        "level": "high"/"medium"/"low",
        "recommended_response_time": "..."
    }
    """
    msg_lower = message.lower()

    # 1️⃣ Check high urgency keywords first
    for kw in HIGH_URGENCY_KEYWORDS:
        if kw in msg_lower:
            return {"level": "high", "recommended_response_time": URGENCY_RESPONSE_TIME["high"]}

    # 2️⃣ Check medium urgency keywords
    for kw in MEDIUM_URGENCY_KEYWORDS:
        if kw in msg_lower:
            return {"level": "medium", "recommended_response_time": URGENCY_RESPONSE_TIME["medium"]}

    # 3️⃣ Check low urgency keywords
    for kw in LOW_URGENCY_KEYWORDS:
        if kw in msg_lower:
            return {"level": "low", "recommended_response_time": URGENCY_RESPONSE_TIME["low"]}

    # 4️⃣ Use intent mapping if keywords don't match
    if intent:
        level = INTENT_URGENCY_MAP.get(intent.lower())
        if level:
            return {"level": level, "recommended_response_time": URGENCY_RESPONSE_TIME[level]}

    # 5️⃣ Default
    return {"level": "medium", "recommended_response_time": URGENCY_RESPONSE_TIME["medium"]}

