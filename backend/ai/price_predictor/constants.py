"""Shared feature names — must match training CSV and NLP extractor."""

ALL_FEATURES = [
    "login",
    "dashboard",
    "ai chatbot",
    "api integration",
    "payment integration",
    "admin panel",
    "database setup",
]

# Optional structured user input: map common labels → canonical feature keys
USER_FEATURE_ALIASES = {
    "login": "login",
    "sign in": "login",
    "authentication": "login",
    "dashboard": "dashboard",
    "admin dashboard": "dashboard",
    "chatbot": "ai chatbot",
    "ai chatbot": "ai chatbot",
    "assistant": "ai chatbot",
    "bot": "ai chatbot",
    "api": "api integration",
    "rest api": "api integration",
    "api integration": "api integration",
    "payment": "payment integration",
    "stripe": "payment integration",
    "checkout": "payment integration",
    "payment integration": "payment integration",
    "admin": "admin panel",
    "admin panel": "admin panel",
    "database": "database setup",
    "db": "database setup",
    "storage": "database setup",
    "database setup": "database setup",
}
