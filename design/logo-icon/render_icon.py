#!/usr/bin/env python3
"""Draw the Playlist Time Machine app icon from geometry.

This is a redraw of the flat clock-and-vinyl logo, not an upscale of the
source JPEG. The canvas is 1024x1024, full bleed, opaque, and square.
iOS applies the rounded mask, so the artwork has no pre-rounded corners.
Key shapes stay inside the center safe area.

Oswald (condensed) and Fraunces Italic are SIL Open Font License.
See OFL-Oswald.txt and OFL-Fraunces.txt.
"""

from __future__ import annotations

import math
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parents[1]
ICON_DIR = REPO / "ios" / "PlaylistTimeMachine" / "Assets.xcassets" / "AppIcon.appiconset"
PREVIEW_DIR = Path("/cursor/stores/self/icon/previews")
ARTIFACT_DIR = Path("/opt/cursor/artifacts")

SIZE = 1024
SCALE = 3
N = SIZE * SCALE

NAVY = np.array([18, 12, 48], dtype=np.float32)
CREAM = np.array([247, 242, 232], dtype=np.float32)
INK = np.array([16, 10, 42], dtype=np.float32)


def font(path: Path, size: int, axes: list[float]) -> ImageFont.FreeTypeFont:
    face = ImageFont.truetype(str(path), size)
    face.set_variation_by_axes(axes)
    return face


def vertical_gradient(top: np.ndarray, bottom: np.ndarray) -> np.ndarray:
    t = np.linspace(0.0, 1.0, N, dtype=np.float32)[:, None, None]
    return top * (1.0 - t) + bottom * t


def vignette(strength: float) -> np.ndarray:
    y, x = np.ogrid[:N, :N]
    cx = cy = (N - 1) / 2.0
    rx = np.abs(x - cx) / cx
    ry = np.abs(y - cy) / cy
    edge = np.clip(np.maximum(rx, ry) - 0.55, 0.0, 1.0) / 0.45
    return (edge ** 1.6) * strength


def circle(cx: float, cy: float, radius: float, feather: float = 1.15) -> np.ndarray:
    y, x = np.ogrid[:N, :N]
    dist = np.sqrt((x - cx) ** 2 + (y - cy) ** 2)
    return np.clip((radius - dist) / feather + 0.5, 0.0, 1.0).astype(np.float32)


def ring(cx: float, cy: float, radius: float, width: float) -> np.ndarray:
    y, x = np.ogrid[:N, :N]
    dist = np.sqrt((x - cx) ** 2 + (y - cy) ** 2)
    outer = np.clip((radius - dist) / 1.15 + 0.5, 0.0, 1.0)
    inner = np.clip((radius - width - dist) / 1.15 + 0.5, 0.0, 1.0)
    return np.clip(outer - inner, 0.0, 1.0).astype(np.float32)


def over(base: np.ndarray, color: np.ndarray, alpha: np.ndarray) -> np.ndarray:
    a = alpha[..., None]
    return base * (1.0 - a) + color * a


def blur_alpha(alpha: np.ndarray, radius: float) -> np.ndarray:
    image = Image.fromarray(np.clip(alpha * 255.0, 0, 255).astype(np.uint8), "L")
    image = image.filter(ImageFilter.GaussianBlur(radius))
    return np.asarray(image).astype(np.float32) / 255.0


def shift(alpha: np.ndarray, dx: int, dy: int) -> np.ndarray:
    out = np.zeros_like(alpha)
    h, w = alpha.shape
    src_x0 = max(0, -dx)
    src_y0 = max(0, -dy)
    dst_x0 = max(0, dx)
    dst_y0 = max(0, dy)
    width = w - abs(dx)
    height = h - abs(dy)
    out[dst_y0:dst_y0 + height, dst_x0:dst_x0 + width] = alpha[src_y0:src_y0 + height, src_x0:src_x0 + width]
    return out


def radial(cx: float, cy: float, radius: float) -> np.ndarray:
    y, x = np.ogrid[:N, :N]
    return np.sqrt((x - cx) ** 2 + (y - cy) ** 2) / max(radius, 1.0)


def disc(canvas: np.ndarray, cx: float, cy: float, radius: float, colors: dict) -> np.ndarray:
    body = circle(cx, cy, radius)
    shadow = blur_alpha(shift(body, int(10 * SCALE), int(16 * SCALE)), 14 * SCALE)
    canvas = over(canvas, colors["shadow"], shadow * 0.45)
    falloff = np.clip(radial(cx, cy, radius), 0.0, 1.0)
    fill = colors["vinyl_core"] * (1.0 - falloff[..., None]) + colors["vinyl_edge"] * falloff[..., None]
    canvas = canvas * (1.0 - body[..., None]) + fill * body[..., None]
    for groove_r, tone in (
        (0.86, 0.55),
        (0.72, 0.28),
        (0.58, 0.62),
        (0.44, 0.30),
    ):
        groove = ring(cx, cy, radius * groove_r, 2.2 * SCALE)
        canvas = over(canvas, colors["groove"], groove * tone)
    sheen_center_x = cx - radius * 0.28
    sheen_center_y = cy - radius * 0.34
    sheen = np.clip(1.0 - radial(sheen_center_x, sheen_center_y, radius * 0.95), 0.0, 1.0) ** 1.7
    canvas = over(canvas, colors["sheen"], sheen * body * 0.34)
    arc = ring(cx - radius * 0.08, cy - radius * 0.1, radius * 0.78, 7 * SCALE)
    arc *= circle(cx - radius * 0.2, cy - radius * 0.45, radius * 0.7)
    canvas = over(canvas, colors["sheen"], arc * body * 0.55)
    label_r = radius * 0.30
    canvas = over(canvas, colors["label"], circle(cx, cy, label_r))
    canvas = over(canvas, colors["label_ring"], ring(cx, cy, label_r, 3.2 * SCALE))
    play = play_alpha(cx + label_r * 0.08, cy, label_r * 0.46)
    canvas = over(canvas, colors["play"], play)
    return canvas


def play_alpha(cx: float, cy: float, radius: float) -> np.ndarray:
    height = radius * 1.7
    width = radius * 1.45
    points = np.array(
        [
            [cx - width * 0.42, cy - height / 2.0],
            [cx - width * 0.42, cy + height / 2.0],
            [cx + width * 0.58, cy],
        ],
        dtype=np.float32,
    )
    mask = Image.new("L", (N, N), 0)
    draw = ImageDraw.Draw(mask)
    draw.polygon([tuple(point) for point in points], fill=255)
    return np.asarray(mask).astype(np.float32) / 255.0


def clock_hand(angle: float, length: float, width: float) -> list[tuple[float, float]]:
    # Angle is clockwise from 12 o'clock.
    theta = math.radians(angle - 90.0)
    forward = np.array([math.cos(theta), math.sin(theta)], dtype=np.float32)
    side = np.array([-forward[1], forward[0]], dtype=np.float32)
    return [
        tuple(side * width * 0.5),
        tuple(forward * length + side * width * 0.16),
        tuple(forward * length - side * width * 0.16),
        tuple(-side * width * 0.5),
    ]


def clock(canvas: np.ndarray, cx: float, cy: float, radius: float, colors: dict) -> np.ndarray:
    body = circle(cx, cy, radius)
    shadow = blur_alpha(shift(body, int(8 * SCALE), int(14 * SCALE)), 12 * SCALE)
    canvas = over(canvas, colors["shadow"], shadow * 0.38)
    falloff = np.clip(radial(cx - radius * 0.15, cy - radius * 0.2, radius * 1.15), 0.0, 1.0)
    face = colors["face_hi"] * (1.0 - falloff[..., None]) + colors["face_lo"] * falloff[..., None]
    canvas = canvas * (1.0 - body[..., None]) + face * body[..., None]
    rim_shade = np.clip(radial(cx, cy, radius) - 0.72, 0.0, 1.0) / 0.28
    canvas = over(canvas, colors["face_shade"], rim_shade * body * 0.55)
    canvas = over(canvas, colors["stroke"], ring(cx, cy, radius, 11 * SCALE))
    highlight = ring(cx, cy, radius - 2 * SCALE, 5 * SCALE)
    highlight *= circle(cx - radius * 0.15, cy - radius * 0.7, radius * 0.95)
    canvas = over(canvas, colors["highlight"], highlight * 0.85)
    for hour in range(12):
        angle = math.radians(hour * 30.0 - 90.0)
        outer = radius * 0.78
        inner = radius * (0.60 if hour % 3 == 0 else 0.68)
        x0 = cx + math.cos(angle) * inner
        y0 = cy + math.sin(angle) * inner
        x1 = cx + math.cos(angle) * outer
        y1 = cy + math.sin(angle) * outer
        tick = Image.new("L", (N, N), 0)
        draw = ImageDraw.Draw(tick)
        draw.line((x0, y0, x1, y1), fill=255, width=int(7 * SCALE if hour % 3 == 0 else 4 * SCALE))
        canvas = over(canvas, colors["stroke"], np.asarray(tick).astype(np.float32) / 255.0)
    hands = Image.new("L", (N, N), 0)
    draw = ImageDraw.Draw(hands)
    for angle, length, width in ((305.0, radius * 0.46, 16 * SCALE), (60.0, radius * 0.68, 11 * SCALE)):
        shape = [(cx + px, cy + py) for px, py in clock_hand(angle, length, width)]
        draw.polygon(shape, fill=255)
    canvas = over(canvas, colors["stroke"], np.asarray(hands).astype(np.float32) / 255.0)
    canvas = over(canvas, colors["stroke"], circle(cx, cy, 8 * SCALE))
    canvas = over(canvas, colors["highlight"], circle(cx - 2 * SCALE, cy - 2 * SCALE, 3 * SCALE))
    return canvas


def tracked_text(text: str, face: ImageFont.FreeTypeFont, tracking: float, fill: tuple[int, int, int]) -> Image.Image:
    probe = ImageDraw.Draw(Image.new("RGB", (4, 4)))
    widths = [probe.textlength(char, font=face) for char in text]
    ascent, descent = face.getmetrics()
    height = ascent + descent + 8
    width = int(math.ceil(sum(widths) + tracking * (len(text) - 1) + 8))
    image = Image.new("RGBA", (max(width, 1), height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    x = 4.0
    for char, char_width in zip(text, widths):
        draw.text((x, 4), char, font=face, fill=fill + (255,))
        x += char_width + tracking
    return image


def fit_face(path: Path, axes: list[float], text: str, target: float, tracking_em: float) -> tuple[ImageFont.FreeTypeFont, float]:
    size = 200 * SCALE
    for _ in range(14):
        face = font(path, size, axes)
        tracking = size * tracking_em
        image = tracked_text(text, face, tracking, (0, 0, 0))
        if abs(image.width - target) < 2 * SCALE:
            return face, tracking
        size = max(40, int(size * target / max(image.width, 1)))
    return font(path, size, axes), size * tracking_em


def alpha_bbox(image: Image.Image) -> tuple[int, int, int, int]:
    alpha = np.asarray(image.split()[-1])
    ys, xs = np.where(alpha > 16)
    return int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())


def paste_text(
    canvas: np.ndarray,
    image: Image.Image,
    cx: float,
    ink_top: float,
    shadow: np.ndarray,
    color: np.ndarray,
) -> np.ndarray:
    x0, y0, x1, y1 = alpha_bbox(image)
    x = int(cx - (x0 + x1) / 2.0)
    y = int(ink_top - y0)
    layer = Image.new("RGBA", (N, N), (0, 0, 0, 0))
    layer.paste(image, (x, y), image)
    alpha = np.asarray(layer.split()[-1]).astype(np.float32) / 255.0
    shade = blur_alpha(shift(alpha, int(1 * SCALE), int(3 * SCALE)), 2.4 * SCALE)
    canvas = over(canvas, shadow, shade * 0.22)
    return over(canvas, color, alpha)


def render(kind: str) -> Image.Image:
    if kind == "light":
        colors = {
            "top": np.array([248, 245, 238], dtype=np.float32),
            "bottom": np.array([214, 214, 232], dtype=np.float32),
            "shadow": np.array([28, 22, 58], dtype=np.float32),
            "vinyl_core": np.array([58, 44, 112], dtype=np.float32),
            "vinyl_edge": np.array([16, 12, 36], dtype=np.float32),
            "groove": np.array([176, 168, 214], dtype=np.float32),
            "sheen": np.array([255, 250, 244], dtype=np.float32),
            "label": np.array([246, 241, 230], dtype=np.float32),
            "label_ring": INK,
            "play": INK,
            "face_hi": np.array([255, 252, 247], dtype=np.float32),
            "face_lo": np.array([232, 228, 242], dtype=np.float32),
            "face_shade": np.array([92, 84, 128], dtype=np.float32),
            "stroke": INK,
            "highlight": np.array([255, 255, 255], dtype=np.float32),
            "text": INK,
            "text_shadow": np.array([40, 32, 72], dtype=np.float32),
        }
    elif kind == "dark":
        colors = {
            "top": np.array([14, 10, 32], dtype=np.float32),
            "bottom": np.array([42, 28, 92], dtype=np.float32),
            "shadow": np.array([0, 0, 0], dtype=np.float32),
            "vinyl_core": np.array([78, 58, 140], dtype=np.float32),
            "vinyl_edge": np.array([8, 6, 20], dtype=np.float32),
            "groove": np.array([186, 176, 224], dtype=np.float32),
            "sheen": np.array([255, 248, 240], dtype=np.float32),
            "label": np.array([244, 238, 226], dtype=np.float32),
            "label_ring": INK,
            "play": INK,
            "face_hi": np.array([250, 246, 238], dtype=np.float32),
            "face_lo": np.array([214, 208, 228], dtype=np.float32),
            "face_shade": np.array([72, 64, 104], dtype=np.float32),
            "stroke": INK,
            "highlight": np.array([255, 255, 255], dtype=np.float32),
            "text": CREAM,
            "text_shadow": np.array([0, 0, 0], dtype=np.float32),
        }
    else:
        colors = {
            "top": np.array([12, 12, 12], dtype=np.float32),
            "bottom": np.array([28, 28, 28], dtype=np.float32),
            "shadow": np.array([0, 0, 0], dtype=np.float32),
            "vinyl_core": np.array([58, 58, 58], dtype=np.float32),
            "vinyl_edge": np.array([10, 10, 10], dtype=np.float32),
            "groove": np.array([168, 168, 168], dtype=np.float32),
            "sheen": np.array([255, 255, 255], dtype=np.float32),
            "label": np.array([236, 236, 236], dtype=np.float32),
            "label_ring": np.array([16, 16, 16], dtype=np.float32),
            "play": np.array([16, 16, 16], dtype=np.float32),
            "face_hi": np.array([246, 246, 246], dtype=np.float32),
            "face_lo": np.array([214, 214, 214], dtype=np.float32),
            "face_shade": np.array([80, 80, 80], dtype=np.float32),
            "stroke": np.array([14, 14, 14], dtype=np.float32),
            "highlight": np.array([255, 255, 255], dtype=np.float32),
            "text": np.array([242, 242, 242], dtype=np.float32),
            "text_shadow": np.array([0, 0, 0], dtype=np.float32),
        }

    canvas = vertical_gradient(colors["top"], colors["bottom"])
    canvas = canvas * (1.0 - vignette(0.22 if kind != "tinted" else 0.35)[..., None])
    glow = np.clip(1.0 - radial(430 * SCALE, 300 * SCALE, 340 * SCALE), 0.0, 1.0) ** 1.8
    lift = np.array([255, 252, 248], dtype=np.float32) if kind != "tinted" else np.array([80, 80, 80], dtype=np.float32)
    canvas = over(canvas, lift, glow * (0.18 if kind == "light" else 0.10))

    s = SCALE
    # Clock overlaps the left of the record. The play label stays clear of the clock.
    canvas = disc(canvas, 624 * s, 352 * s, 150 * s, colors)
    canvas = clock(canvas, 398 * s, 304 * s, 146 * s, colors)

    playlist_face, playlist_tracking = fit_face(
        ROOT / "Oswald-Variable.ttf",
        [700],
        "PLAYLIST",
        790 * s,
        0.03,
    )
    # A slight horizontal squeeze keeps the italic line large enough to read at 60px.
    time_squeeze = 0.84
    time_face, time_tracking = fit_face(
        ROOT / "Fraunces-Italic-Variable.ttf",
        [48, 760, 0, 0],
        "TIME MACHINE",
        800 * s / time_squeeze,
        0.012,
    )
    ink = tuple(int(channel) for channel in colors["text"])
    playlist = tracked_text("PLAYLIST", playlist_face, playlist_tracking, ink)
    time_line = tracked_text("TIME MACHINE", time_face, time_tracking, ink)
    time_line = time_line.resize(
        (max(1, int(time_line.width * time_squeeze)), time_line.height),
        Image.Resampling.LANCZOS,
    )
    _, py0, _, py1 = alpha_bbox(playlist)
    _, ty0, _, ty1 = alpha_bbox(time_line)
    playlist_top = 548 * s
    time_top = playlist_top + (py1 - py0) + 30 * s
    canvas = paste_text(canvas, playlist, 512 * s, playlist_top, colors["text_shadow"], colors["text"])
    canvas = paste_text(canvas, time_line, 512 * s, time_top, colors["text_shadow"], colors["text"])

    image = Image.fromarray(np.clip(canvas, 0, 255).astype(np.uint8), "RGB")
    return image.resize((SIZE, SIZE), Image.Resampling.LANCZOS)


def save_rgb(image: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    rgb = Image.new("RGB", image.size, (0, 0, 0))
    rgb.paste(image.convert("RGB"))
    rgb.save(path, "PNG")
    raw = path.read_bytes()
    if raw[25] != 2 or b"tRNS" in raw:
        raise SystemExit(f"{path} is not opaque RGB")


def assert_safe(path: Path) -> None:
    image = np.asarray(Image.open(path).convert("RGB")).astype(np.int16)
    ink = image.mean(axis=2) < 96
    ys, xs = np.where(ink)
    bounds = (int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max()))
    print(path.name, "ink", bounds)
    if bounds[0] < 96 or bounds[1] < 96 or bounds[2] > 927 or bounds[3] > 927:
        raise SystemExit(f"{path.name} leaves the safe area: {bounds}")
    radius = 210
    outside = 0
    for x, y in zip(xs[::8], ys[::8]):
        cx = min(max(int(x), radius), SIZE - 1 - radius)
        cy = min(max(int(y), radius), SIZE - 1 - radius)
        if (int(x) - cx) ** 2 + (int(y) - cy) ** 2 > radius ** 2:
            outside += 1
    if outside:
        raise SystemExit(f"{path.name} has {outside} ink samples outside the icon mask")


def main() -> None:
    light = render("light")
    dark = render("dark")
    tinted = render("tinted")
    save_rgb(light, ICON_DIR / "AppIcon.png")
    save_rgb(dark, ICON_DIR / "AppIcon-dark.png")
    save_rgb(tinted, ICON_DIR / "AppIcon-tinted.png")
    assert_safe(ICON_DIR / "AppIcon.png")
    for size, name in ((1024, "icon-1024.png"), (180, "icon-180.png"), (120, "icon-120.png"), (60, "icon-60.png")):
        preview = light if size == 1024 else light.resize((size, size), Image.Resampling.LANCZOS)
        save_rgb(preview, PREVIEW_DIR / name)
        save_rgb(preview, ARTIFACT_DIR / name)
    for kind, image in (("dark", dark), ("tinted", tinted)):
        save_rgb(image, PREVIEW_DIR / f"icon-{kind}-1024.png")
        save_rgb(image.resize((60, 60), Image.Resampling.LANCZOS), PREVIEW_DIR / f"icon-{kind}-60.png")
        save_rgb(image, ARTIFACT_DIR / f"icon-{kind}-1024.png")
        save_rgb(image.resize((60, 60), Image.Resampling.LANCZOS), ARTIFACT_DIR / f"icon-{kind}-60.png")
    print("wrote", ICON_DIR)


if __name__ == "__main__":
    main()
