"""Generate the KCT Hub web assets from the designer's PNG artwork.

Source : design/images/brand/kct-hub/*.png (official logo files, do not edit)
Output : public/brand/kct-hub-logo-{light,dark}.png  wordmark (header, footer, admin login)
         public/brand/kct-hub-icon.png               square mark (admin navigation)
         public/icon-512.png, public/apple-touch-icon.png, public/favicon.ico
         public/og-kct-hub.png                       default Open Graph image 1200x630

Usage (from the repo root; requires Pillow): python design/scripts/generate-brand-assets.py
Re-run whenever the designer delivers new logo files. If an SVG logo becomes available, prefer
it for the wordmark/favicons (sharper at every size) and update BrandLogo + layout icons.
"""
import os
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(sys.argv[1] if len(sys.argv) > 1 else '.').resolve()
SRC = ROOT / 'design' / 'images' / 'brand' / 'kct-hub'
PUB = ROOT / 'public'
BRAND = PUB / 'brand'
BRAND.mkdir(exist_ok=True)

# Sampled from the official artwork.
NAVY = (20, 33, 61)  # #14213D
CREAM = (242, 241, 238)  # #F2F1EE
LIME = (205, 242, 40)  # #CDF228


def trimmed(name):
    im = Image.open(SRC / name).convert('RGBA')
    return im.crop(im.getchannel('A').getbbox())


def save_png(im, path):
    im.save(path, optimize=True)
    print(f'{path.relative_to(ROOT)} {im.size} {path.stat().st_size // 1024}KB')


def font(names, size):
    """First available font from the list (Windows, Linux and macOS locations)."""
    dirs = [Path(os.environ.get('WINDIR', 'C:/Windows')) / 'Fonts', Path('/usr/share/fonts'),
            Path('/Library/Fonts'), Path('/System/Library/Fonts')]
    for name in names:
        for d in dirs:
            hits = list(d.rglob(name)) if d.exists() else []
            if hits:
                return ImageFont.truetype(str(hits[0]), size)
    return ImageFont.load_default(size)


# 1. Horizontal wordmarks. 128px tall = 4x the ~32px display height (sharp on HiDPI).
for variant, src in (('light', 'Terang'), ('dark', 'Gelap')):
    im = trimmed(f'KCT Hub - Logo Horizontal - {src} (transparan).png')
    h = 128
    im = im.resize((round(im.width * h / im.height), h), Image.LANCZOS)
    save_png(im, BRAND / f'kct-hub-logo-{variant}.png')

# 2. Square mark on navy. Opaque on purpose: iOS/Android launchers ignore or blacken alpha.
mark = trimmed('KCT Hub - Logo - Gelap (transparan).png')
side = round(max(mark.size) * 1.24)
square = Image.new('RGBA', (side, side), NAVY + (255,))
square.alpha_composite(mark, ((side - mark.width) // 2, (side - mark.height) // 2))
for size, path in ((512, PUB / 'icon-512.png'), (180, PUB / 'apple-touch-icon.png'),
                   (128, BRAND / 'kct-hub-icon.png')):
    save_png(square.resize((size, size), Image.LANCZOS).convert('RGB'), path)
square.convert('RGB').save(PUB / 'favicon.ico', sizes=[(16, 16), (32, 32), (48, 48)])
print('public/favicon.ico 16/32/48')

# 3. Default Open Graph image 1200x630 (used when a page has no meta image).
W, H = 1200, 630
og = Image.new('RGBA', (W, H), NAVY + (255,))
# Grid on its own layer: drawing translucent lines directly would overwrite pixels with alpha.
layer = Image.new('RGBA', (W, H), (0, 0, 0, 0))
grid = ImageDraw.Draw(layer)
for x in range(0, W, 48):
    grid.line([(x, 0), (x, H)], fill=CREAM + (16,))
for y in range(0, H, 48):
    grid.line([(0, y), (W, y)], fill=CREAM + (16,))
og.alpha_composite(layer)
logo = trimmed('KCT Hub - Logo Horizontal - Gelap (transparan).png')
lw = 600
logo = logo.resize((lw, round(logo.height * lw / logo.width)), Image.LANCZOS)
top = 170
og.alpha_composite(logo, (100, top))
sub = font(['segoeui.ttf', 'Inter-Regular.ttf', 'DejaVuSans.ttf', 'Arial.ttf'], 40)
chip_font = font(['segoeuib.ttf', 'Inter-Bold.ttf', 'DejaVuSans-Bold.ttf', 'Arial Bold.ttf'], 22)
d = ImageDraw.Draw(og)
d.text((104, top + logo.height + 40), 'Apps by PT Kreasindo Cipta Teknologi', font=sub,
       fill=(203, 208, 219))
label = 'ON GOOGLE PLAY'
cx, cy = 104, top + logo.height + 120
tw = d.textlength(label, font=chip_font)
d.rounded_rectangle([cx, cy, cx + tw + 48, cy + 50], radius=25, outline=LIME, width=2)
d.text((cx + 24, cy + 11), label, font=chip_font, fill=LIME)
save_png(og.convert('RGB'), PUB / 'og-kct-hub.png')
