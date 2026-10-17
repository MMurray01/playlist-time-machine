#!/usr/bin/env python3
"""Draw the Playlist Time Machine app icon as SVG, then a flat RGB PNG.

The type is Fraunces Display Black (SIL Open Font License, see OFL.txt).
Output is 1024x1024, color type RGB, with no alpha and no pre-rounded corners.
"""

import base64
import io
from pathlib import Path

import cairosvg
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = Path(__file__).resolve().parent
FONT_PATH = ROOT / "Fraunces-DisplayBlack.ttf"
ICON_PATH = ROOT.parent / "PlaylistTimeMachine" / "Assets.xcassets" / "AppIcon.appiconset" / "AppIcon.png"
SIZE = 1024
CREAM = "#F3E6CC"
LINES = ("Playlist", "Time", "Machine")


def font_css() -> str:
    encoded = base64.b64encode(FONT_PATH.read_bytes()).decode()
    return (
        "@font-face{"
        "font-family:'Fraunces';"
        f"src:url(data:font/ttf;base64,{encoded}) format('truetype');"
        "font-weight:900;font-style:normal;}"
    )


def font_size_for_width(target: int) -> int:
    probe = Image.new("RGB", (10, 10))
    draw = ImageDraw.Draw(probe)
    size = 200
    for _ in range(12):
        font = ImageFont.truetype(str(FONT_PATH), size)
        width = draw.textlength(LINES[0], font=font)
        if abs(width - target) < 2:
            return size
        size = max(40, int(size * target / max(width, 1)))
    return size


def svg_document(size: int) -> str:
    left = 58
    target = SIZE - left - 36
    font_size = font_size_for_width(target)
    font = ImageFont.truetype(str(FONT_PATH), font_size)
    ascent, descent = font.getmetrics()
    gap = int(font_size * 0.86)
    block = ascent + descent + gap * (len(LINES) - 1)
    top = (SIZE - block) // 2
    first_baseline = top + ascent

    text = []
    for index, line in enumerate(LINES):
        baseline = first_baseline + index * gap
        text.append(
            f'<text x="{left}" y="{baseline}" fill="{CREAM}">{line}</text>'
        )

    # The record sits on the right, partly under the type.
    record_x = 868
    record_y = 548
    grooves = []
    for radius, stroke in (
        (330, "#161616"),
        (292, "#222222"),
        (254, "#141414"),
        (216, "#1C1C1C"),
        (178, "#121212"),
    ):
        grooves.append(
            f'<circle cx="{record_x}" cy="{record_y}" r="{radius}" '
            f'fill="none" stroke="{stroke}" stroke-width="8"/>'
        )

    return f'''<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="{SIZE}" height="{SIZE}" viewBox="0 0 {SIZE} {SIZE}">
  <defs>
    <style>{font_css()}
      text {{ font-family: Fraunces, serif; font-size: {font_size}px; font-weight: 900; }}
    </style>
    <linearGradient id="sunset" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#C2410C"/>
      <stop offset="46%" stop-color="#C2185B"/>
      <stop offset="100%" stop-color="#3B0764"/>
    </linearGradient>
  </defs>
  <rect width="{SIZE}" height="{SIZE}" fill="url(#sunset)"/>
  <g>
    <circle cx="{record_x}" cy="{record_y}" r="392" fill="#0A0A0A"/>
    {''.join(grooves)}
    <circle cx="{record_x}" cy="{record_y}" r="132" fill="#4A2044"/>
    <circle cx="{record_x}" cy="{record_y}" r="16" fill="#0A0A0A"/>
  </g>
  {''.join(text)}
</svg>
'''


def add_grain(image: Image.Image) -> Image.Image:
    noise = Image.effect_noise((SIZE, SIZE), 24).convert("L")
    noise = noise.filter(ImageFilter.GaussianBlur(radius=0.4))
    gray = Image.merge("RGB", (noise, noise, noise))
    # A light blend keeps the type crisp and reads as film grain at icon size.
    return Image.blend(image, gray, 0.07)


def render(svg: str) -> Image.Image:
    png = cairosvg.svg2png(bytestring=svg.encode(), output_width=SIZE, output_height=SIZE)
    image = Image.open(io.BytesIO(png)).convert("RGB")
    return add_grain(image)


def main() -> None:
    svg = svg_document(SIZE)
    (ROOT / "AppIcon.svg").write_text(svg)
    image = render(svg)
    image.save(ICON_PATH, "PNG")
    preview_dir = Path("/opt/cursor/artifacts")
    preview_dir.mkdir(parents=True, exist_ok=True)
    image.save(preview_dir / "app-icon-1024.png", "PNG")
    image.resize((180, 180), Image.Resampling.LANCZOS).save(preview_dir / "app-icon-180.png", "PNG")
    image.resize((60, 60), Image.Resampling.LANCZOS).save("/tmp/app-icon-60.png", "PNG")
    print(f"Wrote {ICON_PATH}")


if __name__ == "__main__":
    main()
