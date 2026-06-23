"""End-to-end faceless-video generation pipeline.

Stages: script (Claude) -> voiceover (TTS) -> visuals (Pillow) -> assemble (ffmpeg).
"""

from __future__ import annotations

import json
import os
import re
from typing import Callable

from ..config import StudioConfig
from . import image_generator, script_generator, video_assembler, voice_generator
from .models import VideoScript

ProgressFn = Callable[[str, float], None]


def _slugify(text: str) -> str:
    slug = re.sub(r"[^a-zA-Z0-9]+", "_", text).strip("_").lower()
    return slug[:50] or "video"


def _noop(message: str, fraction: float) -> None:  # pragma: no cover
    pass


def run(config: StudioConfig, progress: ProgressFn | None = None) -> dict:
    """Run the full pipeline. Returns a dict of output paths.

    `progress(message, fraction)` is called throughout, with fraction in [0, 1].
    """
    progress = progress or _noop
    config.resolve()

    run_dir = os.path.join(config.output_dir, _slugify(config.topic))
    assets_dir = os.path.join(run_dir, "assets")
    os.makedirs(assets_dir, exist_ok=True)

    # 1. Script + metadata.
    progress("Writing script with Claude...", 0.05)
    script = script_generator.generate_script(
        topic=config.topic,
        style=config.style,
        scenes=config.scenes,
        model=config.model,
        api_key=config.api_key,
    )
    progress(f"Script ready: \"{script.title}\" ({len(script.scenes)} scenes)", 0.25)

    total = len(script.scenes)
    # 2 + 3. Voiceover and visuals per scene.
    for i, scene in enumerate(script.scenes):
        base = 0.25 + (i / max(total, 1)) * 0.45

        progress(f"Voicing scene {i + 1}/{total}...", base)
        audio = voice_generator.synthesize(
            scene.narration,
            os.path.join(assets_dir, f"scene_{i:02d}"),
            lang=config.voice_lang,
            tld=config.voice_tld,
        )
        scene.audio_path = audio
        scene.duration = voice_generator.audio_duration(audio)

        progress(f"Rendering visual {i + 1}/{total}...", base + 0.02)
        scene.image_path = image_generator.render_scene_image(
            caption=scene.caption,
            visual=scene.visual,
            out_path=os.path.join(assets_dir, f"scene_{i:02d}.png"),
            resolution=config.resolution,
            index=i,
        )

    # Thumbnail.
    progress("Rendering thumbnail...", 0.72)
    thumb_path = image_generator.render_thumbnail(
        script.thumbnail_text,
        script.title,
        os.path.join(run_dir, "thumbnail.png"),
        config.resolution,
    )

    # 4. Assemble.
    progress("Assembling final video with ffmpeg...", 0.78)
    video_path = os.path.join(run_dir, "video.mp4")
    video_assembler.assemble(script, video_path, assets_dir, config.resolution)

    # 5. Write metadata + transcript.
    progress("Writing metadata...", 0.95)
    meta_path = os.path.join(run_dir, "metadata.json")
    with open(meta_path, "w") as fh:
        json.dump(script.to_metadata(), fh, indent=2)

    transcript_path = os.path.join(run_dir, "transcript.txt")
    with open(transcript_path, "w") as fh:
        fh.write(script.hook + "\n\n")
        for i, scene in enumerate(script.scenes, 1):
            fh.write(f"[Scene {i}] {scene.caption}\n{scene.narration}\n\n")

    progress("Done!", 1.0)
    return {
        "run_dir": run_dir,
        "video": video_path,
        "thumbnail": thumb_path,
        "metadata": meta_path,
        "transcript": transcript_path,
        "title": script.title,
    }
