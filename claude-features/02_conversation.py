"""Demo 02 — Multi-turn conversation.

Maintains a running message history across turns so Claude remembers context.
Run: python 02_conversation.py
"""

import sys
import os
from typing import List

sys.path.insert(0, os.path.dirname(__file__))
from config import get_client, MODEL, MAX_TOKENS

SYSTEM_PROMPT = (
    "You are a concise assistant helping someone learn about space exploration. "
    "Keep answers to 2-3 sentences unless asked for more detail."
)

# Scripted conversation turns so the demo is fully automatic
TURNS = [
    "What was the first spacecraft to land on the Moon?",
    "Who were the astronauts on that mission?",
    "What did they bring back from the Moon?",
    "How does that compare to today's Artemis program?",
]


def send_turn(
    client,
    messages: List[dict],
    user_text: str,
) -> str:
    """Append a user turn, call the API, append the assistant reply, return reply text."""
    messages.append({"role": "user", "content": user_text})

    response = client.messages.create(
        model=MODEL,
        max_tokens=MAX_TOKENS,
        system=SYSTEM_PROMPT,
        messages=messages,
    )

    reply = next(
        (block.text for block in response.content if block.type == "text"), ""
    )
    messages.append({"role": "assistant", "content": reply})
    return reply


def run() -> None:
    client = get_client()
    messages: List[dict] = []

    print("Multi-turn conversation demo")
    print(f"System: {SYSTEM_PROMPT}\n")

    for turn_num, user_text in enumerate(TURNS, 1):
        print(f"{'─' * 60}")
        print(f"Turn {turn_num} — User: {user_text}")
        reply = send_turn(client, messages, user_text)
        print(f"Turn {turn_num} — Claude: {reply}")

    print(f"\n{'─' * 60}")
    print(f"Conversation complete. Total turns: {len(TURNS)}")
    print(f"Messages in history: {len(messages)}")


if __name__ == "__main__":
    run()
