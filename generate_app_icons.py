"""
Generates high-resolution Android launcher icons and PWA icons for Shalom Kerala Stores
Theme: Deep emerald background (#062b1e), Warm gold ring (#d4af37), Palm tree symbol
"""
import os
from PIL import Image, ImageDraw, ImageFont

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
RES_DIR = os.path.join(BASE_DIR, "android", "app", "src", "main", "res")

ICON_SIZES = {
    os.path.join(RES_DIR, "mipmap-mdpi", "ic_launcher.png"): 48,
    os.path.join(RES_DIR, "mipmap-mdpi", "ic_launcher_round.png"): 48,
    os.path.join(RES_DIR, "mipmap-hdpi", "ic_launcher.png"): 72,
    os.path.join(RES_DIR, "mipmap-hdpi", "ic_launcher_round.png"): 72,
    os.path.join(RES_DIR, "mipmap-xhdpi", "ic_launcher.png"): 96,
    os.path.join(RES_DIR, "mipmap-xhdpi", "ic_launcher_round.png"): 96,
    os.path.join(RES_DIR, "mipmap-xxhdpi", "ic_launcher.png"): 144,
    os.path.join(RES_DIR, "mipmap-xxhdpi", "ic_launcher_round.png"): 144,
    os.path.join(RES_DIR, "mipmap-xxxhdpi", "ic_launcher.png"): 192,
    os.path.join(RES_DIR, "mipmap-xxxhdpi", "ic_launcher_round.png"): 192,
    os.path.join(BASE_DIR, "images", "icon-192.png"): 192,
    os.path.join(BASE_DIR, "images", "icon-512.png"): 512,
}

def draw_shalom_icon(size):
    # High-res master canvas (1024x1024)
    master_size = 1024
    img = Image.new("RGBA", (master_size, master_size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Rounded emerald background
    margin = 48
    draw.ellipse(
        [margin, margin, master_size - margin, master_size - margin],
        fill=(6, 43, 30, 255),
        outline=(212, 175, 55, 255),
        width=32
    )

    # Inner circular ring
    inner_margin = margin + 44
    draw.ellipse(
        [inner_margin, inner_margin, master_size - inner_margin, master_size - inner_margin],
        fill=(12, 60, 46, 255),
        outline=(212, 175, 55, 120),
        width=8
    )

    # Draw Palm Tree using clean PIL primitives
    # Trunk
    cx, cy = master_size // 2, master_size // 2 + 60
    trunk_pts = [
        (cx - 24, cy + 220),
        (cx - 16, cy - 30),
        (cx + 16, cy - 30),
        (cx + 24, cy + 220)
    ]
    draw.polygon(trunk_pts, fill=(212, 175, 55, 255))

    # Palm Fronds
    frond_color = (16, 185, 129, 255)
    frond_accent = (52, 211, 153, 255)
    
    # Left Fronds
    draw.arc([cx - 360, cy - 200, cx + 40, cy + 40], start=180, end=330, fill=frond_color, width=32)
    draw.arc([cx - 400, cy - 130, cx + 20, cy + 90], start=180, end=330, fill=frond_accent, width=28)
    
    # Right Fronds
    draw.arc([cx - 40, cy - 200, cx + 360, cy + 40], start=210, end=360, fill=frond_color, width=32)
    draw.arc([cx - 20, cy - 130, cx + 400, cy + 90], start=210, end=360, fill=frond_accent, width=28)

    # Center Crown
    draw.arc([cx - 160, cy - 260, cx + 160, cy - 20], start=220, end=320, fill=frond_color, width=36)

    # Text "SHALOM" at bottom
    try:
        font = ImageFont.truetype("arial.ttf", 80)
    except Exception:
        font = ImageFont.load_default()

    text = "SHALOM"
    bbox = draw.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    draw.text((cx - tw // 2, master_size - margin - 150), text, fill=(246, 224, 94, 255), font=font)

    # Resize to target size with Lanczos filter
    return img.resize((size, size), Image.Resampling.LANCZOS)

def main():
    print("Generating Android mipmap and PWA app icons...")
    for path, sz in ICON_SIZES.items():
        folder = os.path.dirname(path)
        os.makedirs(folder, exist_ok=True)
        icon_img = draw_shalom_icon(sz)
        icon_img.save(path, format="PNG")
        print(f"  [OK] Created {sz}x{sz}: {os.path.relpath(path, BASE_DIR)}")
    print("All icons successfully generated!")

if __name__ == "__main__":
    main()
