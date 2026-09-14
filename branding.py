"""Private, per-channel branding and explicit approval."""
from pathlib import Path
import re
import shutil

from PIL import Image, ImageDraw, ImageFont, ImageOps
from safety import digest, inside, keys, read_json, require, text, write_json

PALETTES = {
    'violet': {'background': '#140b30', 'accent': '#beda61', 'secondary': '#7acbd7'},
    'graphite': {'background': '#111315', 'accent': '#b6ee64', 'secondary': '#70d7e5'},
    'forest': {'background': '#0b2019', 'accent': '#f2ce69', 'secondary': '#96d6f3'},
}


def contrast(color, other='#ffffff'):
    def luminance(value):
        channels = [int(value[i:i + 2], 16) / 255 for i in (1, 3, 5)]
        linear = [v / 12.92 if v <= .04045 else ((v + .055) / 1.055) ** 2.4 for v in channels]
        return sum(v * weight for v, weight in zip(linear, [.2126, .7152, .0722]))
    a, b = sorted([luminance(color), luminance(other)])
    return (b + .05) / (a + .05)


def validate_brand(brand):
    keys(brand, ['version', 'channel', 'language', 'audience', 'tone', 'scene_count', 'colors', 'logo_style'], 'brand')
    require(brand['version'] == 1, 'Unsupported brand version')
    text(brand['channel'], 40)
    require('\n' not in brand['channel'], 'Channel name must be one line')
    require(re.fullmatch(r'[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*', brand['language']), 'Expected a language tag such as en-US')
    text(brand['audience'], 160)
    text(brand['tone'], 100)
    require(type(brand['scene_count']) is int and brand['scene_count'] in (3, 4), 'Choose 3 or 4 scenes')
    require(brand['logo_style'] in ('wordmark', 'monogram', 'provided'), 'Unknown logo style')
    keys(brand['colors'], ['background', 'accent', 'secondary'], 'colors')
    for color in brand['colors'].values():
        require(isinstance(color, str) and re.fullmatch(r'#[0-9a-fA-F]{6}', color), 'Colors must be six-digit hex values')
    require(contrast(brand['colors']['background']) >= 7, 'Background must provide 7:1 contrast with white')
    for role in ('accent', 'secondary'):
        require(contrast(brand['colors'][role], brand['colors']['background']) >= 4.5, f'{role} needs 4.5:1 contrast against background')


def font_path(role):
    candidates = {
        'display': ['/System/Library/Fonts/Supplemental/Arial Black.ttf', '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'],
        'body': ['/System/Library/Fonts/Supplemental/Arial.ttf', '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'],
        'mono': ['/System/Library/Fonts/Supplemental/Courier New.ttf', '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf'],
    }
    return next((p for p in candidates[role] if Path(p).is_file()), '')


def fit_font(copy, path, preferred, minimum, width):
    for size in range(preferred, minimum - 1, -1):
        font = ImageFont.truetype(str(path), size)
        if font.getlength(copy) <= width:
            return font
    raise ValueError(f'Text does not fit: {copy!r}; shorten it instead of changing the template')


def external_file(value, extensions, maximum=30_000_000):
    path = Path(value).expanduser().absolute()
    require(not path.is_symlink(), 'Symlink input is not allowed')
    path = path.resolve(strict=True)
    require(path.is_file() and path.suffix.lower() in extensions, 'Unsupported input format')
    require(0 < path.stat().st_size <= maximum, 'Input size exceeds limit')
    return path


def create(root, brand, fonts, logo=None):
    validate_brand(brand)
    require(not root.exists() and not root.is_symlink(), 'Workspace already exists; use a new directory')
    sources = {role: external_file(value, ('.ttf', '.otf'), 20_000_000) for role, value in fonts.items()}
    require(set(sources) == {'display', 'body', 'mono'}, 'Three font roles are required')
    for path in sources.values():
        ImageFont.truetype(str(path), 32)
    if logo:
        logo = external_file(logo, ('.png', '.jpg', '.jpeg'))
        with Image.open(logo) as image:
            require(max(image.size) <= 4096 and min(image.size) >= 32, 'Logo dimensions must be between 32 and 4096')
            image.verify()
    require(bool(logo) == (brand['logo_style'] == 'provided'), 'Provided logo and logo style disagree')
    root.mkdir(parents=True, exist_ok=False)
    asset = root / 'brand/assets'
    asset.mkdir(parents=True)
    for role, path in sources.items():
        # Fonts stay private; they are never packaged in a source release.
        shutil.copyfile(path, asset / (role + path.suffix.lower()))
    write_json(root / 'brand/brand.json', brand)
    logo_canvas = Image.new('RGBA', (1200, 220))
    if logo:
        with Image.open(logo) as image:
            mark = ImageOps.contain(image.convert('RGBA'), (1200, 220), Image.Resampling.LANCZOS)
            logo_canvas.alpha_composite(mark, (0, (220 - mark.height) // 2))
        require(logo_canvas.getbbox(), 'Logo is fully transparent')
    else:
        draw = ImageDraw.Draw(logo_canvas)
        name = brand['channel']
        left = 0
        if brand['logo_style'] == 'monogram':
            draw.rounded_rectangle((0, 25, 170, 195), radius=24, outline=brand['colors']['accent'], width=8)
            monogram = ''.join(part[0] for part in name.split()[:2]).upper()
            font = fit_font(monogram, sources['display'], 78, 26, 148)
            draw.text((85, 108), monogram, font=font, fill='white', anchor='mm')
            left = 210
        font = fit_font(name, sources['display'], 120, 26, 1190 - left)
        draw.text((left, 110), name, font=font, fill='white', anchor='lm')
    bbox = logo_canvas.getbbox()
    logo_canvas.crop(bbox).save(asset / 'logo.png')
    css = brand_css(brand, asset)
    (asset / 'brand.css').write_text(css, encoding='utf-8')
    for directory in ('intake', 'episodes', 'runs'):
        (root / directory).mkdir()
    preview(root, brand)
    return root / 'brand/preview.png'


def fonts_in(asset):
    return {role: next(p for p in asset.iterdir() if p.stem == role and p.suffix in ('.ttf', '.otf')) for role in ('display', 'body', 'mono')}


def brand_css(brand, asset):
    fonts = fonts_in(asset)
    rules = []
    for family, role, weight in [('BrandSans', 'display', 800), ('BrandSans', 'body', 600), ('BrandMono', 'mono', 400), ('BrandMono', 'mono', 600)]:
        rules.append(f'@font-face{{font-family:{family};src:url("{fonts[role].name}");font-weight:{weight};font-display:block}}')
    c = brand['colors']
    rules.append(f':root{{--purple:{c["background"]};--lime:{c["accent"]};--cyan:{c["secondary"]};--surface:color-mix(in srgb,var(--purple),white 7%);--line:color-mix(in srgb,var(--purple),white 28%);--edge:color-mix(in srgb,var(--cyan),transparent 58%)}}')
    rules.append('html,body{background:#08090b}.logo{height:90px;object-fit:contain;object-position:left center}.editor{background:color-mix(in srgb,var(--purple),black 22%)}.editor-head{background:var(--surface)}.approval,.pipeline div.active{background:color-mix(in srgb,var(--purple),var(--lime) 8%)}')
    return '\n'.join(rules) + '\n'


def preview(root, brand):
    canvas = Image.new('RGB', (1080, 1920), brand['colors']['background'])
    draw = ImageDraw.Draw(canvas)
    fonts = fonts_in(root / 'brand/assets')
    draw.rounded_rectangle((100, 82, 924, 88), radius=3, fill=brand['colors']['accent'])
    with Image.open(root / 'brand/assets/logo.png') as image:
        mark = ImageOps.contain(image.convert('RGBA'), (284, 90))
        canvas.paste(mark, (100, 145 + (90 - mark.height) // 2), mark)
    for copy, y, size, role, color in [
        ('01 / YOUR NEXT SHORT', 278, 27, 'display', brand['colors']['accent']),
        ('ONE IDEA.', 368, 68, 'display', '#ffffff'),
        ('THREE SCENES.', 454, 68, 'display', '#ffffff'),
        ('plan -> preview -> approve', 730, 39, 'mono', brand['colors']['secondary']),
        ('YOUR CAPTIONS GO HERE', 1630, 48, 'display', '#ffffff'),
    ]:
        draw.text((104, y), copy, font=ImageFont.truetype(str(fonts[role]), size), fill=color)
    draw.rounded_rectangle((100, 650, 924, 1010), radius=8, outline=brand['colors']['secondary'], width=2)
    canvas.save(root / 'brand/preview.png')


def brand_files(root):
    directory = root / 'brand'
    return {str(p.relative_to(directory)): digest(inside(directory, str(p.relative_to(directory)))) for p in sorted(directory.rglob('*')) if p.is_file() and p.name != 'approval.json'}


def approve(root, template_hash):
    brand = read_json(inside(root, 'brand/brand.json'))
    validate_brand(brand)
    require(not (root / 'brand/approval.json').exists(), 'Brand already approved; create a new workspace for a new brand version')
    require((root / 'brand/assets/brand.css').read_text() == brand_css(brand, root / 'brand/assets'), 'Brand settings and generated CSS disagree; rerun onboarding in a new workspace')
    write_json(root / 'brand/approval.json', {'status': 'approved', 'template_sha256': template_hash, 'files': brand_files(root)})


def verified(root, template_hash):
    record = read_json(inside(root, 'brand/approval.json'))
    require(record['status'] == 'approved' and record['template_sha256'] == template_hash, 'Brand/template must be approved together')
    require(record['files'] == brand_files(root), 'Brand changed after approval')
    brand = read_json(inside(root, 'brand/brand.json'))
    validate_brand(brand)
    return brand


def thumbnail(root, graphic, headline, label, output=None):
    require(isinstance(headline, list) and len(headline) == 2, 'Thumbnail needs exactly two headline lines')
    for line in headline:
        require(text(line, 24) == line.upper(), 'Thumbnail headline must be uppercase')
    require(text(label, 32) == label.upper(), 'Thumbnail label must be uppercase')
    asset = root / 'brand/assets'
    fonts = fonts_in(asset)
    fitted = [fit_font(line, fonts['display'], 148, 110, 920) for line in headline]
    label_font = fit_font(label, fonts['body'], 42, 42, 920)
    title_bottom = 235 + sum(font.getbbox(line)[3] - font.getbbox(line)[1] + 6 for font, line in zip(fitted, headline))
    require(title_bottom <= 517, 'Thumbnail headline overlaps the accent rule')
    if output is None:
        return
    require(not output.exists(), 'No thumbnail overwrite')
    brand = read_json(root / 'brand/brand.json')
    with Image.open(graphic) as image:
        canvas = ImageOps.fit(image.convert('RGB'), (1080, 1920), method=Image.Resampling.LANCZOS)
    # The type zone stays fixed; variable artwork occupies the lower region.
    draw = ImageDraw.Draw(canvas)
    draw.rectangle((0, 0, 1080, 640), fill='#000000')
    with Image.open(asset / 'logo.png') as image:
        mark = ImageOps.contain(image.convert('RGBA'), (300, 90))
        canvas.paste(mark, (80, 90), mark)
    y = 235
    for line, font in zip(headline, fitted):
        draw.text((80, y), line, font=font, fill='white', stroke_width=1, anchor='lt')
        y += font.getbbox(line)[3] - font.getbbox(line)[1] + 6
    draw.rectangle((80, 523, 228, 535), fill=brand['colors']['accent'])
    draw.text((80, 549), label, font=label_font, fill='white', anchor='lt')
    canvas.save(output, 'JPEG', quality=92, subsampling=0, progressive=True)
