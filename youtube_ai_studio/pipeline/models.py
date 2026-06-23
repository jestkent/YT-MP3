"""Data models for the generation pipeline."""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class Scene:
    """A single beat of the video: narration plus what to show on screen."""

    narration: str          # spoken voiceover text
    visual: str             # description of the visual / image prompt
    caption: str            # short on-screen text overlay

    # Populated during generation.
    audio_path: str | None = None
    image_path: str | None = None
    clip_path: str | None = None
    duration: float = 0.0


@dataclass
class VideoScript:
    """The full generated plan for one video."""

    title: str
    description: str
    tags: list[str]
    hook: str
    thumbnail_text: str
    scenes: list[Scene] = field(default_factory=list)

    def to_metadata(self) -> dict:
        """Serialize the publish-ready metadata (title/description/tags)."""
        return {
            "title": self.title,
            "description": self.description,
            "tags": self.tags,
            "thumbnail_text": self.thumbnail_text,
            "hook": self.hook,
        }
