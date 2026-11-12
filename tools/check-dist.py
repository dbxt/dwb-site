#!/usr/bin/env python3
"""Sanity checks on the built site (dist/). Run after `npm run build`; exits 1 listing every problem found.

  - every internal href/src/srcset target exists in dist/ (or is a redirect declared in dist/_redirects)
  - every page has a title, a meta description, exactly one <h1>, and (unless noindex) a canonical URL
  - no em dashes in page text
  - no unresolved __PLACEHOLDER__ tokens, and no references to retired analytics hosts
"""
import pathlib, re, sys
from urllib.parse import urlparse, unquote

DIST = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else 'dist').resolve()
RETIRED = ('stats.davidwaynebaxter.net', 'matomo.davidwaynebaxter.net')
errors = []

redirects = set()
rf = DIST / '_redirects'
if rf.exists():
    for line in rf.read_text().splitlines():
        parts = line.split()
        if len(parts) >= 3 and not line.startswith('#'):
            redirects.add(parts[0].rstrip('*').rstrip('/'))

def exists(path):
    p = unquote(path).lstrip('/')
    target = DIST / p
    if p == '' or p.endswith('/'): target = target / 'index.html'
    return target.is_file() or (DIST / p / 'index.html').is_file() or path.rstrip('/') in redirects

for page in sorted(DIST.rglob('*.html')):
    rel = page.relative_to(DIST)
    if rel.parts[:3] == ('ai', 'bug-manager', 'demo'): continue  # legacy static demo, redirected away
    html = page.read_text()
    text = re.sub(r'<(script|style)\b.*?</\1>', '', html, flags=re.S)
    noindex = 'noindex' in html
    if not re.search(r'<title>[^<]+</title>', html): errors.append(f'{rel}: missing <title>')
    if not re.search(r'<meta name="description" content="[^"]+"', html): errors.append(f'{rel}: missing meta description')
    if len(re.findall(r'<h1[\s>]', html)) != 1: errors.append(f'{rel}: expected exactly one <h1>')
    if not noindex and '<link rel="canonical"' not in html: errors.append(f'{rel}: missing canonical')
    if re.search('\u2014|&mdash;|&#8212;', text): errors.append(f'{rel}: contains an em dash')
    if re.search(r'__[A-Z][A-Z0-9_]*__', html): errors.append(f'{rel}: unresolved placeholder')
    for host in RETIRED:
        if host in html: errors.append(f'{rel}: references retired host {host}')
    refs = re.findall(r'(?:href|src)="([^"]+)"', html)
    for srcset in re.findall(r'srcset="([^"]+)"', html):
        refs += [c.strip().split()[0] for c in srcset.split(',') if c.strip()]
    for ref in refs:
        u = urlparse(ref)
        if u.scheme or u.netloc or not u.path.startswith('/'): continue
        if not exists(u.path): errors.append(f'{rel}: broken link {ref}')

if errors:
    print(*sorted(set(errors)), sep='\n')
    sys.exit(f'\n{len(set(errors))} problem(s) found in {DIST}')
print(f'dist OK: {len(list(DIST.rglob("*.html")))} HTML files checked')
