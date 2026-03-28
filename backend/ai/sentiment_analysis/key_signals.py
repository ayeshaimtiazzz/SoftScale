import re
import json

import torch

from config import settings


def _extract_last_balanced_object(text: str) -> str | None:
    """Slice from the `{` that pairs with the last `}` (handles nested braces)."""
    end = text.rfind("}")
    if end == -1:
        return None
    depth = 0
    for i in range(end, -1, -1):
        c = text[i]
        if c == "}":
            depth += 1
        elif c == "{":
            depth -= 1
            if depth == 0:
                return text[i : end + 1]
    return None


def extract_llm_output(reply: str):
    """
    Extract the last JSON object from LLM output (full prompt + generation).
    """
    candidates: list[str] = []
    balanced = _extract_last_balanced_object(reply)
    if balanced:
        candidates.append(balanced)
    # Fallback: non-greedy chunks (legacy); try from last to first
    for m in reversed(re.findall(r"\{[\s\S]*?\}", reply)):
        if m not in candidates:
            candidates.append(m)

    for json_str in candidates:
        try:
            return json.loads(json_str)
        except json.JSONDecodeError:
            continue
    return None


def extract_indicators(model, tokenizer, msg: str):
    prompt = f"""
You are an information extraction assistant.

Your task is to analyze a professional message and extract two things:

1. interest_indicators
These are short phrases that show the sender has a positive opinion, appreciation,
or genuine engagement with the recipient or their work.

Examples of interest indicators:
- "Thanks for applying"
- "Great job"
- "Your proposal is well structured"
- "Impressed with your portfolio"
- "Looks promising"

Do NOT include neutral greetings such as:
- "Hi"
- "Hello"
- "Hope you are doing well"

2. action_requests
These are phrases where the sender asks the recipient to do something,
provide information, or take a next step.

Examples of action requests:
- "share your timeline"
- "send your portfolio"
- "provide your availability"
- "schedule a call"
- "confirm your availability"

Remove polite prefixes such as:
- "Can you"
- "Could you"
- "Please"
- "Would you"

Return ONLY a JSON object in the following format:

{{
  "interest_indicators": [...],
  "action_requests": [...]
}}

Strict rules:
- Output JSON ONLY
- Do NOT include explanations
- Do NOT repeat the message
- Do NOT include the prompt
- Do NOT add notes or comments
- Do NOT generate additional text

Message:
\"\"\"{msg}\"\"\"
"""
    inputs = tokenizer(prompt, return_tensors="pt").to(model.device)

    with torch.no_grad():
        output = model.generate(
            **inputs,
            max_new_tokens=settings.SENTIMENT_KEY_SIGNALS_MAX_TOKENS,
            temperature=0.2,
            do_sample=False,
            repetition_penalty=1.1,
            pad_token_id=tokenizer.eos_token_id,
        )

    reply = tokenizer.decode(output[0], skip_special_tokens=True)

    result = extract_llm_output(reply)

    return result


