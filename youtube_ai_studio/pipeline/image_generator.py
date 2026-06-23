"""Visual generation.

Renders a clean title-card style image per scene using Pillow. This keeps the
pipeline fully runnable with no paid image API. The `visual` field from the
script is used as the card theme/subtitle, and `caption` as the headline.

To plug in a real image-generation API later, replace `render_scene_image`
with a call that downloads the generated image and composites the caption.
"""

from __future__ import annotations

import colorsys
import hashlib
import textwrap


def _theme_colors(seed: str) -> tuple[tuple[int, int, int], tuple[int, int, int]]:
    """Derive a deterministic, pleasant gradient from a seed string."""
    h = int(hashlib.md5(seed.encode()).hexdigest(), 16)
    hue = (h % 360) / 360.0
    top = colorsys.hsv_to_rgb(hue, 0.55, 0.30)
    bottom = colorsys.hsv_to_rgb((hue + 0.08) % 1.0, 0.65, 0.12)
    to_rgb = lambda c: tuple(int(x * 255) for x in c)
    return to_rgb(top), to_rgb(bottom)


def _load_font(size: int):
    from PIL import ImageFont

    # Try a few common bundled fonts; fall back to the default bitmap font.
    for name in (
        "DejaVuSans-Bold.ttf",
        "Arial Bold.ttf",
        "arialbd.ttf",
        "DejaVuSans.ttf",
    ):
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            continue
    return ImageFont.load_default()


def render_scene_image(
    caption: str,
    visual: str,
    out_path: str,
    resolution: tuple[int, int],
    index: int,
) -> str:
    """Render a single scene card to `out_path`. Returns the path."""
    try:
        from PIL import Image, ImageDraw
    except ImportError as exc:  # pragma: no cover - dependency guidance
        raise RuntimeError(
            "The 'Pillow' package is required. Install it with: pip install Pillow"
        ) from exc

    width, height = resolution
    top, bottom = _theme_colors(visual or caption or str(index))

    img = Image.new("RGB", (width, height), bottom)
    draw = ImageDraw.Draw(img)

    # Vertical gradient background.
    for y in range(height):
        t = y / max(height - 1, 1)
        r = int(top[0] + (bottom[0] - top[0]) * t)
        g = int(top[1] + (bottom[1] - top[1]) * t)
        b = int(top[2] + (bottom[2] - top[2]) * t)
        draw.line([(0, y), (width, y)], fill=(r, g, b))

    # Accent bar.
    accent = tuple(min(255, c + 90) for c in top)
    bar_w = max(8, width // 240)
    draw.rectangle([0, 0, bar_w, height], fill=accent)

    # Headline (caption) centered, with the visual description as a subtitle.
    headline_size = max(40, width // 16)
    sub_size = max(22, width // 48)
    headline_font = _load_font(headline_size)
    sub_font = _load_font(sub_size)

    wrap_chars = max(12, width // (headline_size // 2))
    headline = (caption or visual or "").upper()
    headline_lines = textwrap.wrap(headline, width=wrap_chars) or [""]

    def text_h(font, line):
        box = draw.textbbox((0, 0), line, font=font)
        return box[3] - box[1]

    line_gap = int(headline_size * 0.25)
    block_h = sum(text_h(headline_font, ln) for ln in headline_lines)
    block_h += line_gap * (len(headline_lines) - 1)

    y = (height - block_h) // 2
    for line in headline_lines:
        box = draw.textbbox((0, 0), line, font=headline_font)
        lw = box[2] - box[0]
        x = (width - lw) // 2
        # Soft shadow for legibility.
        draw.text((x + 3, y + 3), line, font=headline_font, fill=(0, 0, 0))
        draw.text((x, y), line, font=headline_font, fill=(255, 255, 255))
        y += text_h(headline_font, line) + line_gap

    # Subtitle (the visual description), wrapped under the headline.
    sub_wrap = max(20, width // (sub_size // 2))
    sub_lines = textwrap.wrap(visual or "", width=sub_wrap)[:2]
    sy = y + line_gap
    for line in sub_lines:
        box = draw.textbbox((0, 0), line, font=sub_font)
        lw = box[2] - box[0]
        draw.text(((width - lw) // 2, sy), line, font=sub_font, fill=(220, 220, 220))
        sy += text_h(sub_font, line) + 8

    # Scene number badge.
    badge = f"{index + 1:02d}"
    draw.text((width - 90, height - 70), badge, font=sub_font, fill=(255, 255, 255))

    img.save(out_path)
    return out_path


def render_thumbnail(
    thumbnail_text: str,
    title: str,
    out_path: str,
    resolution: tuple[int, int],
) -> str:
    """Render a bold thumbnail image."""
    return render_scene_image(
        caption=thumbnail_text or title,
        visual=title,
        out_path=out_path,
        resolution=resolution,
        index=-1,
    )
