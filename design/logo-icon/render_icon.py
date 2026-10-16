#!/usr/bin/env python3
"""Draw the Playlist Time Machine app icon from geometry.

This is a redraw of the flat clock-and-vinyl logo, not an upscale of the
source JPEG. The canvas is 1024x1024, full bleed, opaque, and square.
iOS applies the rounded mask, so the artwork has no pre-rounded corners.
Key shapes stay inside the center safe area.

Oswald is a condensed sans (SIL Open Font License, see OFL-Oswald.txt).
PLAYLIST and TIME MACHINE use the same upright weight. TIME MACHINE is smaller.
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


def _cover_image(base: np.ndarray, fill: np.ndarray, alpha: np.ndarray) -> np.ndarray:
    src_a = np.clip(alpha, 0.0, 1.0).astype(np.float32)[..., None]
    if base.shape[-1] == 3:
        return base * (1.0 - src_a) + fill * src_a
    dst_a = base[..., 3:4]
    out_a = src_a + dst_a * (1.0 - src_a)
    mixed = fill * src_a + base[..., :3] * dst_a * (1.0 - src_a)
    out_rgb = np.divide(mixed, np.maximum(out_a, 1e-4))
    return np.concatenate([np.clip(out_rgb, 0, 255), np.clip(out_a, 0, 1)], axis=-1)


def over(base: np.ndarray, color: np.ndarray, alpha: np.ndarray) -> np.ndarray:
    src_a = np.clip(alpha, 0.0, 1.0).astype(np.float32)[..., None]
    if base.shape[-1] == 3:
        return base * (1.0 - src_a) + color * src_a
    dst_rgb = base[..., :3]
    dst_a = base[..., 3:4]
    out_a = src_a + dst_a * (1.0 - src_a)
    mixed = color * src_a + dst_rgb * dst_a * (1.0 - src_a)
    out_rgb = np.divide(mixed, np.maximum(out_a, 1e-4))
    return np.concatenate([np.clip(out_rgb, 0, 255), np.clip(out_a, 0, 1)], axis=-1)


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
    canvas = _cover_image(canvas, fill, body)
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
    canvas = _cover_image(canvas, face, body)
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
    color: np.ndarray,
) -> np.ndarray:
    x0, y0, _, _ = alpha_bbox(image)
    _, _, x1, _ = alpha_bbox(image)
    x = int(cx - (x0 + x1) / 2.0)
    y = int(ink_top - y0)
    layer = Image.new("RGBA", (N, N), (0, 0, 0, 0))
    layer.paste(image, (x, y), image)
    alpha = np.asarray(layer.split()[-1]).astype(np.float32) / 255.0
    return over(canvas, color, alpha)


def center_lockup(foreground: np.ndarray) -> np.ndarray:
    """Scale the mark and both lines together into the central 80 percent."""
    alpha = foreground[..., 3]
    ys, xs = np.where(alpha > 0.04)
    y0, y1 = int(ys.min()), int(ys.max())
    x0, x1 = int(xs.min()), int(xs.max())
    crop = foreground[y0 : y1 + 1, x0 : x1 + 1]
    height, width = crop.shape[:2]
    limit = 0.74 * N
    scale = min(limit / width, limit / height)
    resized = Image.fromarray(
        np.dstack(
            [
                np.clip(crop[..., :3], 0, 255).astype(np.uint8),
                np.clip(crop[..., 3] * 255.0, 0, 255).astype(np.uint8),
            ]
        ),
        "RGBA",
    ).resize(
        (max(1, int(round(width * scale))), max(1, int(round(height * scale)))),
        Image.Resampling.LANCZOS,
    )
    canvas = Image.new("RGBA", (N, N), (0, 0, 0, 0))
    canvas.paste(resized, ((N - resized.width) // 2, (N - resized.height) // 2), resized)
    alpha = np.asarray(canvas)[..., 3]
    ys, xs = np.where(alpha > 12)
    left, top = int(xs.min() / SCALE), int(ys.min() / SCALE)
    right, bottom = int(xs.max() / SCALE), int(ys.max() / SCALE)
    print(
        "centered",
        (left, top, right, bottom),
        "margins",
        top,
        SIZE - 1 - bottom,
        left,
        SIZE - 1 - right,
    )
    if left < 112 or top < 112 or right > 911 or bottom > 911:
        raise SystemExit(f"lockup leaves the central 80 percent: {(left, top, right, bottom)}")
    if abs(top - (SIZE - 1 - bottom)) > 4 or abs(left - (SIZE - 1 - right)) > 4:
        raise SystemExit("lockup margins are uneven")
    return np.asarray(canvas).astype(np.float32)


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
            "text": np.array([255, 252, 246], dtype=np.float32),
        }
    else:
        colors = {
            "top": np.array([12, 12, 12], dtype=np.float32),
            "bottom": np.array([28, 28, 28], dtype=np.float32),
            "shadow": np.array([0, 0, 0], dtype=np.float32),
            "vinyl_core": np.array([72, 72, 72], dtype=np.float32),
            "vinyl_edge": np.array([18, 18, 18], dtype=np.float32),
            "groove": np.array([210, 210, 210], dtype=np.float32),
            "sheen": np.array([255, 255, 255], dtype=np.float32),
            "label": np.array([255, 255, 255], dtype=np.float32),
            "label_ring": np.array([12, 12, 12], dtype=np.float32),
            "play": np.array([12, 12, 12], dtype=np.float32),
            "face_hi": np.array([255, 255, 255], dtype=np.float32),
            "face_lo": np.array([232, 232, 232], dtype=np.float32),
            "face_shade": np.array([90, 90, 90], dtype=np.float32),
            "stroke": np.array([8, 8, 8], dtype=np.float32),
            "highlight": np.array([255, 255, 255], dtype=np.float32),
            "text": np.array([255, 255, 255], dtype=np.float32),
        }

    background = vertical_gradient(colors["top"], colors["bottom"])
    background = background * (1.0 - vignette(0.22 if kind != "tinted" else 0.35)[..., None])
    glow = np.clip(1.0 - radial(430 * SCALE, 300 * SCALE, 340 * SCALE), 0.0, 1.0) ** 1.8
    lift = np.array([255, 252, 248], dtype=np.float32) if kind != "tinted" else np.array([80, 80, 80], dtype=np.float32)
    background = over(background, lift, glow * (0.18 if kind == "light" else 0.10))

    s = SCALE
    # Draw the lockup on a transparent layer, then scale it into the safe area.
    # The play label stays clear of the clock.
    foreground = np.zeros((N, N, 4), dtype=np.float32)
    foreground = disc(foreground, 624 * s, 300 * s, 150 * s, colors)
    foreground = clock(foreground, 398 * s, 252 * s, 146 * s, colors)

    oswald = ROOT / "Oswald-Variable.ttf"
    playlist_face, playlist_tracking = fit_face(oswald, [700], "PLAYLIST", 760 * s, 0.02)
    time_face, time_tracking = fit_face(oswald, [700], "TIME MACHINE", 760 * s, 0.02)
    ink = tuple(int(channel) for channel in colors["text"])
    playlist = tracked_text("PLAYLIST", playlist_face, playlist_tracking, ink)
    time_line = tracked_text("TIME MACHINE", time_face, time_tracking, ink)
    _, py0, _, py1 = alpha_bbox(playlist)
    _, ty0, _, _ = alpha_bbox(time_line)
    playlist_top = 500 * s
    time_top = playlist_top + (py1 - py0) + 28 * s
    foreground = paste_text(foreground, playlist, 512 * s, playlist_top, colors["text"])
    foreground = paste_text(foreground, time_line, 512 * s, time_top, colors["text"])
    if time_top + (alpha_bbox(time_line)[3] - ty0) >= N - 8:
        raise SystemExit("TIME MACHINE was drawn off the canvas before scaling")

    placed = center_lockup(foreground)
    alpha = placed[..., 3:4] / 255.0
    canvas = background * (1.0 - alpha) + placed[..., :3] * alpha
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
    ink = image.mean(axis=2) < 70
    ys, xs = np.where(ink)
    left, top, right, bottom = int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())
    print(path.name, "dark ink", (left, top, right, bottom))
    if top < 102 or bottom > 921:
        raise SystemExit(f"{path.name} text or mark is outside the safe area")


def main() -> None:
    light = render("light")
    dark = render("dark")
    tinted = render("tinted")
    save_rgb(light, ICON_DIR / "AppIcon.png")
    save_rgb(dark, ICON_DIR / "AppIcon-dark.png")
    save_rgb(tinted, ICON_DIR / "AppIcon-tinted.png")
    assert_safe(ICON_DIR / "AppIcon.png")
    dark_px = np.asarray(dark).astype(np.int16)
    text_band = dark_px[int(SIZE * 0.58) :]
    bright = text_band.mean(axis=2) > 220
    text_mean = float(text_band[bright].mean()) if bright.any() else 0.0
    print("dark text mean", round(text_mean, 1))
    if text_mean < 248:
        raise SystemExit(f"dark text is not near-white: {text_mean}")
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
