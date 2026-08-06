"""
generate_sprites.py
--------------------
PLACEHOLDER ASSET GENERATOR.

This script does NOT contain real BISINDO fingerspelling hand-shape data.
It exists only so the game has *something* to animate out of the box and so
the sprite-sheet pipeline (loading, slicing, requestAnimationFrame playback,
caching) can be demonstrated and tested end-to-end.

Each generated sheet is a horizontal strip of 16 frames, 256x256 each,
transparent background, saved as WebP at:

    assets/sprites/<LETTER>.webp

The "animation" is a simple stylised hand-silhouette that rotates / opens
slightly across frames, with the letter printed as a watermark. It is NOT an
accurate representation of any real BISINDO handshape.

TO USE REAL BISINDO SPRITES:
1. Obtain/produce a licensed set of BISINDO fingerspelling photos or
   illustrations for A-Z (consult SIBI/BISINDO reference materials or work
   with a certified BISINDO instructor/deaf community consultant).
2. Arrange 16-24 frames per letter, each 256x256, transparent background.
3. Export each letter's frames as ONE horizontal strip WebP file named
   assets/sprites/<LETTER>.webp (same naming/format this script produces).
4. Update js/data.js FRAME_COUNT per letter if your frame count differs.

Run:  python3 tools/generate_sprites.py
"""
import math
import os
from PIL import Image, ImageDraw, ImageFont

FRAME_SIZE = 256
FRAME_COUNT = 16
OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "assets", "sprites")

LETTERS = [chr(c) for c in range(ord('A'), ord('Z') + 1)]

# A distinct hue per letter so letters are visually easy to tell apart
# during development/testing.
def letter_color(letter):
    idx = ord(letter) - ord('A')
    hue = (idx * 137.508) % 360  # golden-angle distribution
    return hsv_to_rgb(hue, 0.55, 0.95)


def hsv_to_rgb(h, s, v):
    h = h / 60.0
    i = int(h) % 6
    f = h - int(h)
    p = v * (1 - s)
    q = v * (1 - f * s)
    t = v * (1 - (1 - f) * s)
    r, g, b = [
        (v, t, p), (q, v, p), (p, v, t),
        (p, q, v), (t, p, v), (v, p, q)
    ][i]
    return (int(r * 255), int(g * 255), int(b * 255))


def get_font(size):
    candidates = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf",
    ]
    for path in candidates:
        if os.path.exists(path):
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()


def draw_hand_placeholder(draw, cx, cy, base_r, open_amount, color):
    """Draw a very simplified 'hand' silhouette: a palm circle plus
    5 finger capsules whose spread/length depends on open_amount (0..1)."""
    palm_r = base_r * 0.55
    draw.ellipse(
        [cx - palm_r, cy - palm_r * 0.7, cx + palm_r, cy + palm_r * 1.3],
        fill=color
    )

    finger_lengths = [0.75, 1.0, 0.95, 0.85, 0.6]  # thumb..pinky proportions
    spread_deg = 40 + open_amount * 50  # fingers spread more when "open"
    start_angle = -90 - spread_deg / 2

    for i, length_ratio in enumerate(finger_lengths):
        angle_deg = start_angle + (spread_deg / (len(finger_lengths) - 1)) * i
        angle = math.radians(angle_deg)
        finger_len = base_r * (0.9 + 0.5 * open_amount) * length_ratio
        finger_w = base_r * 0.16

        fx = cx + math.sin(angle) * finger_len
        fy = cy - palm_r * 0.2 - math.cos(angle) * finger_len

        # capsule-ish finger: draw as a thick line with round caps
        draw.line(
            [(cx + math.sin(angle) * palm_r * 0.3,
              cy - palm_r * 0.2 - math.cos(angle) * palm_r * 0.3),
             (fx, fy)],
            fill=color, width=int(finger_w)
        )
        draw.ellipse(
            [fx - finger_w / 2, fy - finger_w / 2, fx + finger_w / 2, fy + finger_w / 2],
            fill=color
        )


def generate_letter_sheet(letter):
    sheet = Image.new("RGBA", (FRAME_SIZE * FRAME_COUNT, FRAME_SIZE), (0, 0, 0, 0))
    color = letter_color(letter) + (255,)
    font_big = get_font(120)
    font_small = get_font(28)

    for f in range(FRAME_COUNT):
        frame = Image.new("RGBA", (FRAME_SIZE, FRAME_SIZE), (0, 0, 0, 0))
        draw = ImageDraw.Draw(frame)

        t = f / (FRAME_COUNT - 1)  # 0..1 across the animation
        # ease in-out so motion doesn't look linear/robotic
        ease = 0.5 - 0.5 * math.cos(t * math.pi)
        open_amount = ease

        cx, cy = FRAME_SIZE / 2, FRAME_SIZE / 2 + 20
        draw_hand_placeholder(draw, cx, cy, 70, open_amount, color)

        # Letter watermark (helps identify frames during development)
        bbox = draw.textbbox((0, 0), letter, font=font_big)
        tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
        draw.text(
            (cx - tw / 2, 18 - bbox[1]),
            letter, font=font_big, fill=(color[0], color[1], color[2], 70)
        )

        label = f"frame {f + 1}/{FRAME_COUNT}"
        draw.text((10, FRAME_SIZE - 34), label, font=font_small, fill=(90, 90, 90, 180))

        sheet.paste(frame, (f * FRAME_SIZE, 0), frame)

    return sheet


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    for letter in LETTERS:
        sheet = generate_letter_sheet(letter)
        out_path = os.path.join(OUT_DIR, f"{letter}.webp")
        sheet.save(out_path, "WEBP", quality=90, method=6)
        print(f"generated {out_path}")


if __name__ == "__main__":
    main()
