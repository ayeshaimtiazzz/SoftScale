# fake_positivity.py

HEDGING_PHRASES = [
    "we’ll get back",
    "we'll get back",
    "get back to you",
    "still reviewing",
    "currently reviewing",
    "under review",
    "after review",
    "we'll let you know",
    "we will let you know",
    "will update you",
    "will keep you posted",
    "thanks for applying",
    "thanks for your interest",
    "at this stage",
    "at the moment",
]

WEAK_REJECTION_PHRASES = [
    "moving forward with other candidates",
    "decided to proceed with other",
    "not the right fit",
    "not moving forward",
    "other candidates",
]

COMMITMENT_KEYWORDS = [
    "schedule",
    "interview",
    "next round",
    "next step",
    "meeting",
    "call",
    "timeline",
    "offer",
    "availability",
    "start date",
]


def detect_fake_positivity(sentiment_label, sentiment_confidence, intent, text):
    """
    Detect polite but disengaged positivity in recruiter chat messages.

    Returns:
        bool
    """

    score = 0
    t = text.lower()

    # 1️⃣ Positive tone but weak intent
    if sentiment_label == "positive" and intent in ["stalling", "polite_rejection", "internal_review"]:
        score += 2

    # 2️⃣ Weak positive confidence
    if sentiment_label == "positive" and sentiment_confidence < 0.80:
        score += 1

    # 3️⃣ Hedging recruiter language
    if any(phrase in t for phrase in HEDGING_PHRASES):
        score += 2

    # 4️⃣ Soft rejection signals
    if any(phrase in t for phrase in WEAK_REJECTION_PHRASES):
        score += 2

    # 5️⃣ Lack of commitment/action
    if not any(word in t for word in COMMITMENT_KEYWORDS):
        score += 1

    # 6️⃣ Extremely short generic replies
    if len(t.split()) < 10:
        score += 1

    # 7️⃣ If strong action intent exists, reduce suspicion
    if intent in ["interview_invitation", "negotiation_discussion"]:
        score -= 2

    # Threshold tuned for recruiter chat behavior
    return score >= 3

