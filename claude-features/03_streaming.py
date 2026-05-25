"""Demo 03 — Streaming responses.

Tokens print to the terminal as they arrive instead of waiting for the full reply.
Run: python 03_streaming.py
"""

import sys
import os
import time

sys.path.insert(0, os.path.dirname(__file__))
from config import get_client, MODEL

PROMPT = (
    "Write a short story (about 150 words) about a robot who discovers "
    "that it enjoys painting sunsets."
)

LONG_PROMPT = (
    "Explain the key differences between supervised learning, "
    "unsupervised learning, and reinforcement learning, with one "
    "real-world example for each."
)


def stream_response(client, prompt: str, label: str) -> None:
    print(f"\n{'─' * 60}")
    print(f"Prompt ({label}):\n{prompt}")
    print("─" * 60)
    print("Streaming response:\n")

    start = time.monotonic()
    token_count = 0

    with client.messages.stream(
        model=MODEL,
        max_tokens=512,
        messages=[{"role": "user", "content": prompt}],
    ) as stream:
        for text in stream.text_stream:
            print(text, end="", flush=True)
            token_count += 1

        final = stream.get_final_message()

    elapsed = time.monotonic() - start
    print(f"\n\n[done in {elapsed:.1f}s | "
          f"in={final.usage.input_tokens} | "
          f"out={final.usage.output_tokens} tokens]")


def run() -> None:
    client = get_client()

    print("Streaming responses demo")
    print("Tokens are printed as they are generated — no waiting for the full reply.\n")

    stream_response(client, PROMPT, "creative writing")
    stream_response(client, LONG_PROMPT, "technical explanation")

    print(f"\n{'─' * 60}")
    print("Done.")


if __name__ == "__main__":
    run()
