"""Demo 01 — Basic text generation.

Sends a single prompt and prints the response.
Run: python 01_basic_text.py
"""

import sys
import os

sys.path.insert(0, os.path.dirname(__file__))
from config import get_client, MODEL, MAX_TOKENS

PROMPTS = [
    "Explain what a large language model is in two sentences.",
    "List three interesting facts about the planet Saturn.",
    "Write a haiku about software debugging.",
]


def run() -> None:
    client = get_client()

    for i, prompt in enumerate(PROMPTS, 1):
        print(f"\n{'─' * 60}")
        print(f"Prompt {i}: {prompt}")
        print("─" * 60)

        response = client.messages.create(
            model=MODEL,
            max_tokens=MAX_TOKENS,
            messages=[{"role": "user", "content": prompt}],
        )

        for block in response.content:
            if block.type == "text":
                print(block.text)

        print(f"\n[stop_reason={response.stop_reason} | "
              f"in={response.usage.input_tokens} | "
              f"out={response.usage.output_tokens} tokens]")

    print(f"\n{'─' * 60}")
    print("Done.")


if __name__ == "__main__":
    run()
