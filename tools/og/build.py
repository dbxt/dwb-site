#!/usr/bin/env python3
"""Render the 1200x630 social-share cards in assets/og/ from tools/og/card.html.

Needs Chromium and Pillow. Re-run after changing a card, then commit the JPEGs:  python3 tools/og/build.py
Screenshots are WebP in assets/, which Chromium reads but some social scrapers do not, hence the JPEG output.
"""
import pathlib, shutil, subprocess, sys, tempfile, urllib.parse
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parents[2]
CARD = ROOT / 'tools' / 'og' / 'card.html'
OUT = ROOT / 'assets' / 'og'
CHROME = shutil.which('chromium') or shutil.which('chromium-browser') or shutil.which('google-chrome')

CARDS = {
    'default':      dict(kicker='Senior Engineering Manager', title='David Wayne Baxter', sub='20+ years leading platform teams that ship reliably and stay together.', image='headshot-20260906-960.webp', portrait='1'),
    'ai':           dict(kicker='AI Work', title='Applying AI to engineering leadership', sub='Projects built with AI, each with a write-up of how it works.', image='em-dashboard-board-light.webp'),
    'bug-manager':  dict(kicker='AI Work · Case study', title='Agentic bug management', sub='A ranked list a team can burn down.', image='bug-manager-find-light.webp'),
    'sprint-ledger': dict(kicker='AI Work · Case study', title='Sprint Ledger', sub='An engineering-manager dashboard built with Claude.', image='em-dashboard-board-light.webp'),
    'drop-shipping': dict(kicker='AI Work · Case study', title='Drop shipping automation', sub='Nine AI agents, from request to live listing.', image='ai-dsa-workflow.webp'),
    'homepage':     dict(kicker='AI Work · Case study', title='A private dashboard configured with AI', sub='Live cards for every service in the lab.', image='ai-homepage-cards.webp'),
    'engineering-lab': dict(kicker='Engineering Lab', title='Engineering Lab', sub='Proxmox, OPNsense, Docker and Home Assistant, documented.'),
}

def main():
    if not CHROME: sys.exit('chromium not found')
    OUT.mkdir(parents=True, exist_ok=True)
    for name, params in CARDS.items():
        png = pathlib.Path(tempfile.mkdtemp(dir=ROOT / 'tools' / 'og')) / f'{name}.png'
        url = CARD.as_uri() + '?' + urllib.parse.urlencode(params)
        subprocess.run([CHROME, '--headless', '--disable-gpu', '--no-sandbox', '--hide-scrollbars',
                        '--force-device-scale-factor=1', '--window-size=1200,630', '--virtual-time-budget=4000',
                        f'--screenshot={png}', url], check=True, capture_output=True)
        Image.open(png).convert('RGB').save(OUT / f'og-{name}.jpg', 'JPEG', quality=86, optimize=True, progressive=True)
        shutil.rmtree(png.parent)
        print(f'og-{name}.jpg', (OUT / f'og-{name}.jpg').stat().st_size // 1024, 'KB')

if __name__ == '__main__':
    main()
