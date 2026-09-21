#!/usr/bin/env python3
"""Set each <lastmod> in sitemap.xml to the date its page file last changed in git (today, if it has uncommitted edits).

Runs in CI before every deploy (full git history is needed), so lastmod tracks real changes. Also fine to run by hand.
"""
import datetime, pathlib, re, subprocess

ROOT = pathlib.Path(__file__).resolve().parents[1]
SITEMAP = ROOT / 'sitemap.xml'
HOST = 'https://davidwaynebaxter.com/'

def git(*args):
    return subprocess.run(['git', *args], cwd=ROOT, capture_output=True, text=True).stdout

dirty = set(git('diff', '--name-only', 'HEAD').split()) | {l[3:] for l in git('status', '--porcelain').splitlines()}
today = datetime.date.today().isoformat()

def lastmod(loc, current):
    rel = loc[len(HOST):]
    page = rel + 'index.html' if rel == '' or rel.endswith('/') else rel
    if not (ROOT / page).exists(): return current
    if page in dirty: return today
    return git('log', '-1', '--format=%cs', '--', page).strip() or current

def fix(block):
    loc = re.search(r'<loc>([^<]+)</loc>', block.group(0)).group(1)
    cur = re.search(r'<lastmod>([^<]+)</lastmod>', block.group(0)).group(1)
    return block.group(0).replace(f'<lastmod>{cur}</lastmod>', f'<lastmod>{lastmod(loc, cur)}</lastmod>')

text = SITEMAP.read_text()
SITEMAP.write_text(re.sub(r'<url>.*?</url>', fix, text, flags=re.S))
