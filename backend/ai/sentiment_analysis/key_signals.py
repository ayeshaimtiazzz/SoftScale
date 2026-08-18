import re
import json

import torch

from config import settings
from ai.sentiment_analysis.llm_decode import decode_new_tokens, compact_for_llm


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
    short_msg = compact_for_llm(msg, settings.SENTIMENT_LLM_INPUT_MAX_CHARS)
    prompt = f"""
Extract from this professional message:
1) interest_indicators: positive/appreciative phrases (exclude greetings),
2) action_requests: requested actions (remove polite prefixes like "please/can you").

Return JSON only:
{{"interest_indicators": [], "action_requests": []}}

Message:
\"\"\"{short_msg}\"\"\"
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

    reply = decode_new_tokens(tokenizer, output, inputs["input_ids"])

    result = extract_llm_output(reply)

    return result


