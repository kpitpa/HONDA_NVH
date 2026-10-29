"""
Download MarianMT translation models and save them locally.

Run this ONCE on any machine with internet access:
    cd backend
    python download_models.py

After this, the models are bundled in backend/models/ and
the server loads them offline — no HuggingFace download needed.
"""

import os
from transformers import MarianMTModel, MarianTokenizer

MODELS = [
    ("Helsinki-NLP/opus-mt-en-jap", "models/opus-mt-en-jap"),
    ("Helsinki-NLP/opus-mt-jap-en", "models/opus-mt-jap-en"),
]

def main():
    base_dir = os.path.dirname(os.path.abspath(__file__))

    for hf_name, local_folder in MODELS:
        save_path = os.path.join(base_dir, local_folder)
        os.makedirs(save_path, exist_ok=True)

        print(f"\n{'='*60}")
        print(f"Downloading: {hf_name}")
        print(f"Saving to:   {save_path}")
        print(f"{'='*60}")

        print("  -> Loading tokenizer...")
        tokenizer = MarianTokenizer.from_pretrained(hf_name)
        tokenizer.save_pretrained(save_path)
        print("  -> Tokenizer saved.")

        print("  -> Loading model weights...")
        model = MarianMTModel.from_pretrained(hf_name)
        model.save_pretrained(save_path)
        print("  -> Model saved.")

    print(f"\n{'='*60}")
    print("All models downloaded and saved locally!")
    print("The server will now load from backend/models/ without internet.")
    print(f"{'='*60}\n")


if __name__ == "__main__":
    main()