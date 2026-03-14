import re

SIGNATURE_PATTERNS = [
    r"best regards.*",
    r"kind regards.*",
    r"thanks.*",
    r"sincerely.*",
]


def clean_message(text: str) -> str:
    text = text.strip()

    # remove signatures
    for pattern in SIGNATURE_PATTERNS:
        text = re.sub(pattern, "", text, flags=re.IGNORECASE | re.DOTALL)

    # remove greetings
    text = re.sub(r"^(hi|hello|dear)\s+\w+,?", "", text, flags=re.IGNORECASE)

    # normalize whitespace
    text = re.sub(r"\s+", " ", text)

    return text.strip()

