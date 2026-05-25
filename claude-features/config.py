import anthropic

MODEL = "claude-sonnet-4-6"
MAX_TOKENS = 1024


def get_client() -> anthropic.Anthropic:
    """Return a configured Anthropic client (reads ANTHROPIC_API_KEY from env)."""
    return anthropic.Anthropic()
