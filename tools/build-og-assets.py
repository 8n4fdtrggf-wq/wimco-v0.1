#!/usr/bin/env python3
"""Bygger tillgångarna för dynamiska Open Graph-bilder.

Utdata i public/assets/og/:
  base.bin   – zlib-komprimerad RGB-bakgrund (1200x630) med allt statiskt innehåll
  atlas.bin  – zlib-komprimerad alfakarta med alla glyfer som ritas dynamiskt
  atlas.json – glyfmått per teckensnittsstorlek
  ../og-default.png – generell delningsbild för sajten

Kör: python3 tools/build-og-assets.py
"""
import json, os, zlib
from PIL import Image, ImageDraw, ImageFont, PngImagePlugin

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'public', 'assets', 'og')
os.makedirs(OUT, exist_ok=True)
ARCHIVO = os.path.join(ROOT, 'tools', 'fonts', 'Archivo-VF.ttf')
MONO = os.path.join(ROOT, 'tools', 'fonts', 'JetBrainsMono-VF.ttf')

W, H = 1200, 630
NAVY = (11, 27, 51)
PAPER = (243, 245, 244)
SIGNAL = (255, 90, 31)
SOFT = (170, 184, 204)

# Layout – delas med lib/og/render.js via atlas.json["layout"]
LINE_Y = 500
LINE_X0, LINE_X1 = 80, 1120
STATIONS = [
    ('Prestanda', 'performance'), ('Mobil', 'mobile'), ('Tillgänglighet', 'accessibility'),
    ('SEO', 'seo'), ('Visuellt', 'visual'), ('Konvertering', 'conversion'),
]
STATION_X = [int(LINE_X0 + 60 + i * (LINE_X1 - LINE_X0 - 120) / (len(STATIONS) - 1)) for i in range(len(STATIONS))]


def font(path, size, wght=None, wdth=None):
    f = ImageFont.truetype(path, size)
    axes = f.get_variation_axes()
    vals = []
    for a in axes:
        n = a['name'].decode() if isinstance(a['name'], bytes) else a['name']
        if n == 'Weight':
            vals.append(wght if wght is not None else a['default'])
        elif n == 'Width':
            vals.append(wdth if wdth is not None else a['default'])
        else:
            vals.append(a['default'])
    f.set_variation_by_axes(vals)
    return f


def draw_base():
    img = Image.new('RGB', (W, H), NAVY)
    d = ImageDraw.Draw(img)
    logo = font(ARCHIVO, 44, 800, 112)
    d.text((80, 58), 'Wimco', font=logo, fill=PAPER)
    lw = d.textlength('Wimco', font=logo)
    d.text((80 + lw, 58), '.', font=logo, fill=SIGNAL)
    lab = font(ARCHIVO, 26, 600, 110)
    t = 'Wimco Score'
    d.text((W - 80 - d.textlength(t, font=lab), 72), t, font=lab, fill=SOFT)
    # linjen
    d.rounded_rectangle((LINE_X0, LINE_Y - 6, LINE_X1, LINE_Y + 6), radius=6, fill=SIGNAL)
    small = font(ARCHIVO, 22, 600, 104)
    for (name, _), x in zip(STATIONS, STATION_X):
        tw = d.textlength(name, font=small)
        d.text((x - tw / 2, LINE_Y - 58), name, font=small, fill=SOFT)
    foot = font(ARCHIVO, 22, 500, 100)
    t = 'Gratis analys på wimco.se'
    d.text((W - 80 - d.textlength(t, font=foot), H - 52), t, font=foot, fill=SOFT)
    return img


ATLAS_SPECS = {
    'domain': dict(path=ARCHIVO, size=66, wght=760, wdth=108, chars='abcdefghijklmnopqrstuvwxyz0123456789.-åäöüéæøñç'),
    'domainSm': dict(path=ARCHIVO, size=44, wght=760, wdth=104, chars='abcdefghijklmnopqrstuvwxyz0123456789.-åäöüéæøñç'),
    'score': dict(path=ARCHIVO, size=236, wght=850, wdth=112, chars='0123456789'),
    'of': dict(path=ARCHIVO, size=54, wght=600, wdth=110, chars='/0123456789'),
    'grade': dict(path=ARCHIVO, size=34, wght=650, wdth=110, chars='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzåäöÅÄÖ '),
    'station': dict(path=MONO, size=26, wght=650, chars='0123456789–'),
}


def build_atlas():
    glyph_imgs = []
    meta = {}
    for key, spec in ATLAS_SPECS.items():
        f = font(spec['path'], spec['size'], spec.get('wght'), spec.get('wdth'))
        ascent, descent = f.getmetrics()
        meta[key] = {'ascent': ascent, 'descent': descent, 'glyphs': {}}
        for ch in spec['chars']:
            adv = f.getlength(ch)
            bbox = f.getbbox(ch)  # relativt ritpunkt (topp-vänster av ascent-rutan)
            if ch == ' ' or bbox[2] - bbox[0] <= 0:
                meta[key]['glyphs'][ch] = {'w': 0, 'h': 0, 'ox': 0, 'oy': 0, 'adv': round(adv, 2), 'x': 0, 'y': 0}
                continue
            gw, gh = bbox[2] - bbox[0], bbox[3] - bbox[1]
            g = Image.new('L', (gw, gh), 0)
            ImageDraw.Draw(g).text((-bbox[0], -bbox[1]), ch, font=f, fill=255)
            glyph_imgs.append((key, ch, g))
            meta[key]['glyphs'][ch] = {'w': gw, 'h': gh, 'ox': bbox[0], 'oy': bbox[1], 'adv': round(adv, 2)}
    # enkel radpackning
    sheet_w = 2048
    x = y = row_h = 0
    for key, ch, g in glyph_imgs:
        if x + g.width > sheet_w:
            x, y, row_h = 0, y + row_h + 2, 0
        meta[key]['glyphs'][ch]['x'] = x
        meta[key]['glyphs'][ch]['y'] = y
        x += g.width + 2
        row_h = max(row_h, g.height)
    sheet_h = y + row_h
    sheet = Image.new('L', (sheet_w, sheet_h), 0)
    for key, ch, g in glyph_imgs:
        m = meta[key]['glyphs'][ch]
        sheet.paste(g, (m['x'], m['y']))
    return sheet, meta


def main():
    base = draw_base()
    with open(os.path.join(OUT, 'base.bin'), 'wb') as fh:
        fh.write(zlib.compress(base.tobytes(), 9))
    sheet, meta = build_atlas()
    with open(os.path.join(OUT, 'atlas.bin'), 'wb') as fh:
        fh.write(zlib.compress(sheet.tobytes(), 9))
    layout = {
        'width': W, 'height': H, 'sheetWidth': sheet.width, 'sheetHeight': sheet.height,
        'lineY': LINE_Y, 'stations': [{'id': sid, 'x': x} for (_, sid), x in zip(STATIONS, STATION_X)],
        'colors': {'navy': NAVY, 'paper': PAPER, 'signal': SIGNAL, 'soft': SOFT,
                   'pass': (14, 143, 98), 'warn': (240, 162, 2), 'fail': (224, 52, 42)},
    }
    with open(os.path.join(OUT, 'atlas.json'), 'w') as fh:
        json.dump({'layout': layout, 'fonts': meta}, fh, separators=(',', ':'), ensure_ascii=False)

    # Generell delningsbild
    img = Image.new('RGB', (W, H), NAVY)
    d = ImageDraw.Draw(img)
    logo = font(ARCHIVO, 44, 800, 112)
    d.text((80, 58), 'Wimco', font=logo, fill=PAPER)
    d.text((80 + d.textlength('Wimco', font=logo), 58), '.', font=logo, fill=SIGNAL)
    big = font(ARCHIVO, 68, 820, 104)
    d.text((80, 170), 'Hemsidor, webbverktyg och', font=big, fill=PAPER)
    d.text((80, 252), 'automation som presterar.', font=big, fill=PAPER)
    d.rounded_rectangle((LINE_X0, LINE_Y - 6, LINE_X1, LINE_Y + 6), radius=6, fill=SIGNAL)
    small = font(ARCHIVO, 24, 600, 104)
    for i, name in enumerate(['Hemsidor', 'Webbutveckling', 'AI och automation', 'Wimco Score']):
        x = int(LINE_X0 + 60 + i * (LINE_X1 - LINE_X0 - 120) / 3)
        d.ellipse((x - 16, LINE_Y - 16, x + 16, LINE_Y + 16), fill=PAPER, outline=NAVY, width=6)
        tw = d.textlength(name, font=small)
        d.text((x - tw / 2, LINE_Y + 34), name, font=small, fill=SOFT)
    meta = PngImagePlugin.PngInfo()
    meta.add_text('impeccable-prompt', 'ORIGIN: rendered programmatically by tools/build-og-assets.py (PIL, Archivo font, Wimco palette); not generated by an image model.')
    img.save(os.path.join(ROOT, 'public', 'assets', 'og-default.png'), optimize=True, pnginfo=meta)
    print('OG-tillgångar byggda:', os.listdir(OUT))


if __name__ == '__main__':
    main()
