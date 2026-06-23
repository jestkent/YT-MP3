"""Text-to-speech voiceover generation.

Primary backend is gTTS (Google TTS, needs internet, natural sounding).
Falls back to pyttsx3 (fully offline) if gTTS is unavailable.
"""

from __future__ import annotations

import os
import subprocess


def _has_module(name: str) -> bool:
    try:
        __import__(name)
        return True
    except ImportError:
        return False


def synthesize(text: str, out_path: str, lang: str = "en", tld: str = "com") -> str:
    """Render `text` to an audio file at `out_path`. Returns the path written.

    gTTS writes mp3; pyttsx3 writes wav. The returned path reflects what was
    actually written (extension may change for the fallback).
    """
    if _has_module("gtts"):
        from gtts import gTTS

        mp3_path = os.path.splitext(out_path)[0] + ".mp3"
        gTTS(text=text, lang=lang, tld=tld).save(mp3_path)
        return mp3_path

    if _has_module("pyttsx3"):
        import pyttsx3

        wav_path = os.path.splitext(out_path)[0] + ".wav"
        engine = pyttsx3.init()
        engine.save_to_file(text, wav_path)
        engine.runAndWait()
        return wav_path

    raise RuntimeError(
        "No text-to-speech backend available. Install one with:\n"
        "  pip install gTTS        (recommended, needs internet)\n"
        "  pip install pyttsx3     (offline fallback)"
    )


def audio_duration(path: str) -> float:
    """Return audio duration in seconds using ffprobe."""
    result = subprocess.run(
        [
            "ffprobe", "-v", "error",
            "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1",
            path,
        ],
        capture_output=True,
        text=True,
    )
    try:
        return float(result.stdout.strip())
    except ValueError:
        return 0.0
