#!/usr/bin/env python3
"""Tell IndexNow search engines (Bing, Yandex, Naver, Seznam, Yep) which pages changed.

  python3 tools/indexnow.py --before <sha> --after <sha>   pages changed between two commits (used by the deploy workflow)
  python3 tools/indexnow.py --all                          every URL in sitemap.xml
  python3 tools/indexnow.py --dry-run ...                  print the URLs instead of sending them

Only URLs listed in sitemap.xml are ever submitted. The key is public by design: IndexNow verifies it by fetching
https://<host>/<key>.txt, so the key file lives in the site root and is committed.
Google does not support IndexNow; it relies on the sitemap and Search Console.
"""
import argparse, json, pathlib, re, subprocess, sys, urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[1]
HOST = 'davidwaynebaxter.com'
ENDPOINT = 'https://api.indexnow.org/IndexNow'
MAX_CHANGED = 20  # a bigger change (a redesign, a shared template edit) is simply resubmitted in full

def sitemap_urls():
    return re.findall(r'<loc>([^<]+)</loc>', (ROOT / 'sitemap.xml').read_text())

def page_url(path):
    if path == 'index.html': return f'https://{HOST}/'
    if path.endswith('/index.html'): return f'https://{HOST}/{path[:-len("index.html")]}'
    return None

def changed_urls(before, after):
    if not before or set(before) == {'0'}: return sitemap_urls()
    names = subprocess.run(['git', 'diff', '--name-only', before, after], cwd=ROOT, capture_output=True, text=True, check=True).stdout.split()
    if 'sitemap.xml' in names or len(names) > MAX_CHANGED: return sitemap_urls()
    known = set(sitemap_urls())
    return sorted({u for u in map(page_url, names) if u in known})

def key():
    keys = [p.stem for p in ROOT.glob('*.txt') if re.fullmatch(r'[0-9a-f]{32}', p.stem)]
    if len(keys) != 1: sys.exit(f'expected exactly one IndexNow key file in the site root, found {len(keys)}')
    return keys[0]

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--before'); ap.add_argument('--after', default='HEAD')
    ap.add_argument('--all', action='store_true'); ap.add_argument('--dry-run', action='store_true')
    a = ap.parse_args()
    urls = sitemap_urls() if a.all else changed_urls(a.before, a.after)
    if not urls: return print('No indexable pages changed; nothing to submit.')
    k = key()
    body = json.dumps({'host': HOST, 'key': k, 'keyLocation': f'https://{HOST}/{k}.txt', 'urlList': urls}).encode()
    print(f'{len(urls)} URL(s):', *urls, sep='\n  ')
    if a.dry_run: return
    req = urllib.request.Request(ENDPOINT, data=body, headers={'Content-Type': 'application/json; charset=utf-8'})
    try:
        with urllib.request.urlopen(req, timeout=30) as r: print('IndexNow response:', r.status, r.reason)
    except urllib.error.HTTPError as e:
        print('IndexNow error:', e.code, e.reason, e.read().decode()[:300]); sys.exit(1)

if __name__ == '__main__':
    main()
