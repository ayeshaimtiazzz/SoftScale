"""Decode only newly generated tokens from model.generate() output (exclude the prompt)."""


def decode_new_tokens(tokenizer, sequences, input_ids) -> str:
    """
    sequences: LongTensor [batch, total_len] from model.generate
    input_ids: LongTensor [batch, prompt_len] fed into generate
    """
    if sequences is None or input_ids is None:
        return ""
    prompt_len = int(input_ids.shape[1])
    gen_ids = sequences[0, prompt_len:]
    return tokenizer.decode(gen_ids, skip_special_tokens=True).strip()
