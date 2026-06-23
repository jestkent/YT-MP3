"""Generate a video script + publish metadata with Claude.

Uses the Anthropic Messages API with structured outputs so the response is a
guaranteed-valid JSON object we can turn directly into a VideoScript.
"""

from __future__ import annotations

import json

from .models import Scene, VideoScript

# JSON schema that constrains Claude's output. Structured outputs guarantee the
# response parses to exactly this shape (no minLength/maxLength — unsupported).
_SCHEMA = {
    "type": "object",
    "properties": {
        "title": {"type": "string"},
        "description": {"type": "string"},
        "tags": {"type": "array", "items": {"type": "string"}},
        "hook": {"type": "string"},
        "thumbnail_text": {"type": "string"},
        "scenes": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "narration": {"type": "string"},
                    "visual": {"type": "string"},
                    "caption": {"type": "string"},
                },
                "required": ["narration", "visual", "caption"],
                "additionalProperties": False,
            },
        },
    },
    "required": ["title", "description", "tags", "hook", "thumbnail_text", "scenes"],
    "additionalProperties": False,
}

_SYSTEM = """You are a scriptwriter for a faceless YouTube channel. You write \
tight, engaging, retention-optimized scripts meant to be read by a text-to-speech \
voiceover over simple on-screen visuals.

Rules:
- The hook is the first spoken line: make it impossible to scroll past in one sentence.
- Each scene's narration is one short paragraph (2-4 sentences) of natural, \
spoken-style prose. No stage directions, no "in this video", no markdown.
- visual: a concrete description of the image to show for that scene (used as an \
image-generation prompt and as the on-screen card theme).
- caption: a punchy on-screen text overlay of at most a few words.
- title: a compelling, clickable YouTube title (no clickbait lies).
- description: 2-3 sentence YouTube description ending with a soft call to action.
- tags: 8-12 lowercase search tags, no '#'.
- thumbnail_text: 2-5 words of bold thumbnail text.
Write for the requested style and topic. Keep it accurate."""


def generate_script(
    topic: str,
    style: str,
    scenes: int,
    model: str,
    api_key: str,
) -> VideoScript:
    """Call Claude and return a populated VideoScript."""
    try:
        import anthropic
    except ImportError as exc:  # pragma: no cover - dependency guidance
        raise RuntimeError(
            "The 'anthropic' package is required. Install it with: pip install anthropic"
        ) from exc

    client = anthropic.Anthropic(api_key=api_key)

    prompt = (
        f"Topic: {topic}\n"
        f"Style: {style}\n"
        f"Number of scenes: {scenes}\n\n"
        f"Write the full script and metadata. Produce exactly {scenes} scenes."
    )

    response = client.messages.create(
        model=model,
        max_tokens=16000,
        thinking={"type": "adaptive"},
        system=_SYSTEM,
        messages=[{"role": "user", "content": prompt}],
        output_config={"format": {"type": "json_schema", "schema": _SCHEMA}},
    )

    # With output_config.format the first text block is guaranteed-valid JSON.
    text = next(b.text for b in response.content if b.type == "text")
    data = json.loads(text)

    return VideoScript(
        title=data["title"],
        description=data["description"],
        tags=list(data["tags"]),
        hook=data["hook"],
        thumbnail_text=data["thumbnail_text"],
        scenes=[
            Scene(
                narration=s["narration"],
                visual=s["visual"],
                caption=s["caption"],
            )
            for s in data["scenes"]
        ],
    )
