import json

import torch

from config import settings
from ai.sentiment_analysis.llm_decode import decode_new_tokens, compact_for_llm


def extract_json_output(text: str):
    """
    Extract JSON object from LLM output text.
    Returns a Python dictionary.
    """
    try:
        start = text.find("{")
        end = text.rfind("}") + 1

        if start == -1 or end == -1:
            raise ValueError("No JSON object found")

        json_str = text[start:end]
        data = json.loads(json_str)

        return data

    except Exception as e:
        print("JSON extraction failed:", e)
        return None


def summarize_message(model, tokenizer, msg: str):
    short_msg = compact_for_llm(msg, settings.SENTIMENT_LLM_INPUT_MAX_CHARS)
    # Fill the prompt with actual values
    prompt = f"""
Summarize this recruiter/client message in 2-3 concise sentences.
Return JSON only: {{"summary":"..."}}

Message:
"{short_msg}"
"""

    # Tokenize input
    inputs = tokenizer(prompt, return_tensors="pt").to(model.device)

    # Generate output
    with torch.no_grad():
        output = model.generate(
            **inputs,
            max_new_tokens=settings.SENTIMENT_SUMMARY_MAX_TOKENS,
            temperature=0.2,
            do_sample=False,
            repetition_penalty=1.1,
            pad_token_id=tokenizer.eos_token_id,
        )

    reply = decode_new_tokens(tokenizer, output, inputs["input_ids"])
    result = extract_json_output(reply)

    return result


