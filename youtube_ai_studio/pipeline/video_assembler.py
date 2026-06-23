"""Assemble per-scene image+audio clips into a final video with ffmpeg."""

from __future__ import annotations

import os
import subprocess

from .models import VideoScript


def _run(cmd: list[str]) -> None:
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(
            "ffmpeg command failed:\n"
            + " ".join(cmd)
            + "\n\n"
            + (result.stderr or result.stdout)[-2000:]
        )


def build_scene_clip(
    image_path: str,
    audio_path: str,
    out_path: str,
    resolution: tuple[int, int],
) -> str:
    """Create an mp4 clip showing `image_path` for the length of `audio_path`."""
    width, height = resolution
    _run([
        "ffmpeg", "-y",
        "-loop", "1", "-i", image_path,
        "-i", audio_path,
        "-c:v", "libx264",
        "-tune", "stillimage",
        "-c:a", "aac", "-b:a", "192k",
        "-pix_fmt", "yuv420p",
        "-vf", f"scale={width}:{height}",
        "-shortest",
        out_path,
    ])
    return out_path


def concat_clips(clip_paths: list[str], out_path: str, work_dir: str) -> str:
    """Concatenate scene clips into the final video using the concat demuxer."""
    list_file = os.path.join(work_dir, "concat.txt")
    with open(list_file, "w") as fh:
        for clip in clip_paths:
            fh.write(f"file '{os.path.abspath(clip)}'\n")

    _run([
        "ffmpeg", "-y",
        "-f", "concat", "-safe", "0",
        "-i", list_file,
        "-c", "copy",
        out_path,
    ])
    return out_path


def assemble(script: VideoScript, out_path: str, work_dir: str, resolution) -> str:
    """Build all scene clips (using paths already populated on each Scene) and
    concatenate them into the final video at `out_path`."""
    clip_paths = []
    for i, scene in enumerate(script.scenes):
        if not scene.image_path or not scene.audio_path:
            raise RuntimeError(f"Scene {i + 1} is missing its image or audio.")
        clip = os.path.join(work_dir, f"clip_{i:02d}.mp4")
        build_scene_clip(scene.image_path, scene.audio_path, clip, resolution)
        scene.clip_path = clip
        clip_paths.append(clip)

    return concat_clips(clip_paths, out_path, work_dir)
