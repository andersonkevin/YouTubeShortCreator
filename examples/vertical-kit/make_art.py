"""Generates the demo cover artwork (an abstract glowing waveform) so the example ships no third-party imagery.
python3 examples/vertical-kit/make_art.py -> examples/vertical-kit/img/waveform.jpg (1080x1240)."""
import math
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

W, H = 1080, 1240
img = Image.new('RGB', (W, H), (7, 10, 16))
glow = Image.new('RGB', (W, H), (0, 0, 0))
d = ImageDraw.Draw(glow)
for k in range(54):
    x = 40 + k * 19
    a = (0.25 + 0.75 * abs(math.sin(k * 0.37) * math.cos(k * 0.11 + 1))) * (0.35 + 0.65 * math.sin(math.pi * k / 53))
    h = 80 + 820 * a
    c = (int(40 + 200 * a), int(110 + 90 * a), int(190 + 50 * a)) if k % 7 else (244, 183, 64)
    d.rounded_rectangle([x, H * .55 - h / 2, x + 9, H * .55 + h / 2], radius=4, fill=c)
img.paste(Image.blend(glow.filter(ImageFilter.GaussianBlur(28)), glow, .55))
out = Path(__file__).resolve().parent / 'img/waveform.jpg'
out.parent.mkdir(exist_ok=True)
img.save(out, quality=86)
print(out)
