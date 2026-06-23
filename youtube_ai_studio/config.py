"""Configuration and environment helpers for YouTube AI Studio."""

from __future__ import annotations

import os
import shutil
from dataclasses import dataclass, field

# The Claude model used for script + metadata generation.
# Opus 4.8 is the current most capable Opus-tier model.
DEFAULT_MODEL = "claude-opus-4-8"

# Video presets: (width, height) in pixels.
PRESETS = {
    "landscape": (1920, 1080),  # standard YouTube video
    "short": (1080, 1920),       # YouTube Shorts / vertical
}


@dataclass
class StudioConfig:
    """Runtime configuration for a single generation run."""

    topic: str
    style: str = "educational"
    scenes: int = 5
    preset: str = "landscape"
    voice_lang: str = "en"
    voice_tld: str = "com"  # gTTS accent, e.g. "com" (US), "co.uk", "com.au"
    model: str = DEFAULT_MODEL
    output_dir: str = "output"
    api_key: str | None = None

    # Populated after validation.
    resolution: tuple[int, int] = field(default=(1920, 1080))

    def resolve(self) -> "StudioConfig":
        """Fill in derived values and validate basic inputs."""
        if self.preset not in PRESETS:
            raise ValueError(f"Unknown preset '{self.preset}'. Choose from {list(PRESETS)}.")
        self.resolution = PRESETS[self.preset]

        if not self.topic or not self.topic.strip():
            raise ValueError("A topic is required.")

        self.scenes = max(1, min(int(self.scenes), 12))

        if not self.api_key:
            self.api_key = os.environ.get("ANTHROPIC_API_KEY")
        if not self.api_key:
            raise ValueError(
                "No Anthropic API key found. Set the ANTHROPIC_API_KEY environment "
                "variable or paste a key into the app."
            )
        return self


def find_executable(name: str) -> str | None:
    """Return the path to an executable on PATH, or None."""
    return shutil.which(name)


def check_ffmpeg() -> tuple[bool, str]:
    """Verify ffmpeg + ffprobe are available."""
    missing = [tool for tool in ("ffmpeg", "ffprobe") if not find_executable(tool)]
    if missing:
        return False, (
            "Missing required tool(s): "
            + ", ".join(missing)
            + ".\nInstall ffmpeg (which bundles ffprobe) and ensure it is on your PATH."
        )
    return True, "ffmpeg and ffprobe found."
