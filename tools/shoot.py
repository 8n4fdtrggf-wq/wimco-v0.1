#!/usr/bin/env python3
"""Skärmdumpar av lokala sidor med Playwright/Chromium.

python3 tools/shoot.py URL OUT.png [--w 1440] [--h 900] [--full] [--wait 1500] [--reduced] [--click SELECTOR] [--type SELECTOR=TEXT] [--submit SELECTOR] [--after 6000]

Google Fonts-anrop besvaras från lokala typsnittsfiler (GFONTS_DIR) så att sidor som
laddar dem renderas som i produktion även utan internet.
"""
import argparse, os, re, sys
from playwright.sync_api import sync_playwright

GFONTS = os.environ.get('GFONTS_DIR', '/tmp/claude-0/gfonts/ofl')
FAMILIES = {
    'Fraunces': ('fraunces/Fraunces[SOFT,WONK,opsz,wght].ttf', 'fraunces/Fraunces-Italic[SOFT,WONK,opsz,wght].ttf'),
    'Inter': ('inter/Inter[opsz,wght].ttf', 'inter/Inter-Italic[opsz,wght].ttf'),
    'JetBrains Mono': ('jetbrainsmono/JetBrainsMono[wght].ttf', 'jetbrainsmono/JetBrainsMono-Italic[wght].ttf'),
}


def font_css():
    css = []
    for fam, (normal, italic) in FAMILIES.items():
        for style, f in (('normal', normal), ('italic', italic)):
            css.append(f"@font-face{{font-family:'{fam}';font-style:{style};font-weight:100 900;src:url(https://fonts.gstatic.com/local/{f}) format('truetype');}}")
    return '\n'.join(css)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('url'); ap.add_argument('out')
    ap.add_argument('--w', type=int, default=1440); ap.add_argument('--h', type=int, default=900)
    ap.add_argument('--full', action='store_true'); ap.add_argument('--wait', type=int, default=1200)
    ap.add_argument('--reduced', action='store_true')
    ap.add_argument('--type', action='append', default=[]); ap.add_argument('--click', action='append', default=[])
    ap.add_argument('--after', type=int, default=0); ap.add_argument('--scroll', default=None)
    ap.add_argument('--console', action='store_true')
    a = ap.parse_args()
    os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
    with sync_playwright() as p:
        b = p.chromium.launch()
        ctx = b.new_context(viewport={'width': a.w, 'height': a.h}, device_scale_factor=1,
                            reduced_motion='reduce' if a.reduced else 'no-preference', locale='sv-SE')
        page = ctx.new_page()
        errors = []
        page.on('console', lambda m: errors.append(f'{m.type}: {m.text}') if m.type in ('error', 'warning') else None)
        page.on('pageerror', lambda e: errors.append(f'pageerror: {e}'))

        def fonts(route):
            u = route.request.url
            if 'fonts.googleapis.com' in u:
                return route.fulfill(status=200, content_type='text/css', body=font_css())
            m = re.search(r'fonts\.gstatic\.com/local/(.+)$', u)
            if m:
                path = os.path.join(GFONTS, m.group(1).replace('%5B', '[').replace('%5D', ']').replace('%2C', ','))
                if os.path.exists(path):
                    return route.fulfill(status=200, content_type='font/ttf', body=open(path, 'rb').read())
            return route.abort()
        page.route(re.compile(r'https://fonts\.(googleapis|gstatic)\.com/.*'), fonts)
        page.route(re.compile(r'https://(www\.googletagmanager|challenges\.cloudflare)\.com/.*'), lambda r: r.abort())

        page.goto(a.url, wait_until='networkidle')
        page.wait_for_timeout(a.wait)
        for t in a.type:
            sel, txt = t.split('=', 1)
            page.fill(sel, txt)
        for c in a.click:
            page.click(c)
        if a.after:
            page.wait_for_timeout(a.after)
        if a.full:
            # Scrolla igenom sidan så att lazy-laddade bilder hämtas före helsidesbilden.
            page.evaluate('async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 60)); } window.scrollTo(0, 0); }')
            page.wait_for_timeout(600)
        if a.scroll:
            page.locator(a.scroll).first.scroll_into_view_if_needed()
            page.wait_for_timeout(400)
        page.screenshot(path=a.out, full_page=a.full)
        overflow = page.evaluate('document.documentElement.scrollWidth - document.documentElement.clientWidth')
        print(f'{a.out} overflow={overflow}px')
        if a.console or errors:
            for e in errors:
                print('  ', e)
        b.close()


if __name__ == '__main__':
    sys.exit(main())
