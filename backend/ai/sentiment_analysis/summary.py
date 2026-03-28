import json

import torch

from config import settings


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
    # Fill the prompt with actual values
    prompt = f"""
You are an assistant that helps a candidate manage recruiter communications. 
Read the message below and generate a detailed summary in 5 to 6 sentences, 

Return the output only as a JSON object with the key "summary".

Message:
"{msg}"

JSON Output:
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

    # Decode text
    reply = tokenizer.decode(output[0], skip_special_tokens=True)
    result = extract_json_output(reply)

    return result


