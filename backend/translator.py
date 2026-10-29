"""Offline EN↔JA translation using Helsinki-NLP MarianMT models.

Models are loaded from local `models/` folder (pre-bundled).
If not found locally, falls back to downloading from HuggingFace.
Run `python download_models.py` once to pre-bundle.
"""

import os
import threading

_lock = threading.Lock()
_models = {}

# Resolve paths relative to this file's directory
_BASE_DIR = os.path.dirname(os.path.abspath(__file__))
_MODEL_PATHS = {
    "en_to_ja": {
        "local": os.path.join(_BASE_DIR, "models", "opus-mt-en-jap"),
        "hf": "Helsinki-NLP/opus-mt-en-jap",
    },
    "ja_to_en": {
        "local": os.path.join(_BASE_DIR, "models", "opus-mt-jap-en"),
        "hf": "Helsinki-NLP/opus-mt-jap-en",
    },
}


def _get_model(direction: str):
    """Lazy-load model and tokenizer. direction: 'en_to_ja' or 'ja_to_en'."""
    if direction in _models:
        return _models[direction]
    with _lock:
        if direction in _models:
            return _models[direction]
        from transformers import MarianMTModel, MarianTokenizer

        paths = _MODEL_PATHS[direction]
        local_path = paths["local"]

        # Use local pre-bundled models if available, otherwise fall back to HF
        if os.path.isdir(local_path) and os.listdir(local_path):
            print(f"[translator] Loading {direction} model from local: {local_path}")
            name = local_path
        else:
            print(f"[translator] Local model not found at {local_path}, downloading from HuggingFace...")
            name = paths["hf"]

        tokenizer = MarianTokenizer.from_pretrained(name)
        model = MarianMTModel.from_pretrained(name)
        _models[direction] = (tokenizer, model)
        return tokenizer, model


def translate(text: str, source: str = "en", target: str = "ja") -> str:
    """Translate a single string. source/target: 'en' or 'ja'."""
    if not text or not text.strip():
        return text
    direction = f"{source}_to_{target}"
    if direction not in ("en_to_ja", "ja_to_en"):
        return text
    tokenizer, model = _get_model(direction)
    inputs = tokenizer(text, return_tensors="pt", padding=True, truncation=True, max_length=512)
    outputs = model.generate(**inputs, max_length=512, num_beams=4)
    result = tokenizer.decode(outputs[0], skip_special_tokens=True)
    return result


def translate_batch(texts: list[str], source: str = "en", target: str = "ja") -> list[str]:
    """Translate a batch of strings."""
    if not texts:
        return []
    direction = f"{source}_to_{target}"
    if direction not in ("en_to_ja", "ja_to_en"):
        return texts
    tokenizer, model = _get_model(direction)
    inputs = tokenizer(texts, return_tensors="pt", padding=True, truncation=True, max_length=512)
    outputs = model.generate(**inputs, max_length=512, num_beams=4)
    results = [tokenizer.decode(o, skip_special_tokens=True) for o in outputs]
    return results