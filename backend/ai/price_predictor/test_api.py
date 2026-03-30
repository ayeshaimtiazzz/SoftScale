"""Manual test against FastAPI (requires server + auth token)."""

import os
import sys

import requests

BASE = os.environ.get("API_BASE", "http://127.0.0.1:8000/api")
TOKEN = os.environ.get("AUTH_TOKEN", "")
URL = f"{BASE.rstrip('/')}/predict-price"

payload = {
    "project_description": "Build AI chatbot with login and dashboard",
    "region": "pakistan",
    "experience_level": "intermediate",
    "freelancer_level": "senior",
    "effort": 1.2,
    "urgency": 1.1,
}

headers = {"Content-Type": "application/json"}
if TOKEN:
    headers["Authorization"] = f"Bearer {TOKEN}"

if __name__ == "__main__":
    if not TOKEN:
        print("Set AUTH_TOKEN env var to a JWT for a logged-in user.", file=sys.stderr)
    r = requests.post(URL, json=payload, headers=headers, timeout=120)
    print("STATUS:", r.status_code)
    print(r.text)
