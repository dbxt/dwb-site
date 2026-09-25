#!/usr/bin/env python3
"""Fill the home page's "Latest" list with the newest pages from Ideas, AI Work, Engineering Lab and Fun.

A page is listed when its JSON-LD has an Article or TechArticle with a headline and datePublished, so section index
pages are skipped. Newest first; pages published the same day are ordered by when they were first committed.
Runs in CI before every deploy (full git history is needed for the tie-break). Also fine to run by hand to preview.
"""
import datetime, html, json, pathlib, re, subprocess, sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
HOME = ROOT / 'index.html'
SECTIONS = {'ideas': 'Ideas', 'ai': 'AI Work', 'lab': 'Engineering Lab', 'fun': 'Fun'}
COUNT = 3
START, END = '<!-- latest:start -->', '<!-- latest:end -->'

def first_commit(path):
    out = subprocess.run(['git', 'log', '--follow', '--diff-filter=A', '--format=%at', '--', str(path)],
                         cwd=ROOT, capture_output=True, text=True).stdout.split()
    return int(out[-1]) if out else 2**31  # not committed yet: treat as newest

def pages():
    for folder, section in SECTIONS.items():
        for path in sorted((ROOT / folder).rglob('index.html')):
            m = re.search(r'<script type="application/ld\+json">(.*?)</script>', path.read_text(), re.S)
            if not m:
                continue
            data = json.loads(m.group(1))
            for node in data.get('@graph', [data]):
                if node.get('@type') in ('Article', 'TechArticle') and node.get('datePublished') and node.get('headline'):
                    url = '/' + str(path.parent.relative_to(ROOT)) + '/'
                    yield dict(date=node['datePublished'], title=node['headline'], url=url, section=section,
                               added=first_commit(path.relative_to(ROOT)))
                    break

def main():
    items = sorted(pages(), key=lambda p: (p['date'], p['added']), reverse=True)[:COUNT]
    rows = []
    for p in items:
        d = datetime.date.fromisoformat(p['date'])
        rows.append(f'            <li><time datetime="{p["date"]}">{d:%b} {d.day}, {d.year}</time>'
                    f'<span><a class="textlink" href="{p["url"]}">{html.escape(html.unescape(p["title"]), quote=False)}</a>'
                    f' <span class="where">· {p["section"]}</span></span></li>')
    src = HOME.read_text()
    if src.count(START) != 1 or src.count(END) != 1:
        sys.exit(f'{HOME.name}: expected one {START} and one {END}')
    head, rest = src.split(START)
    _, tail = rest.split(END)
    HOME.write_text(head + START + '\n' + '\n'.join(rows) + '\n            ' + END + tail)
    for p in items:
        print(p['date'], p['section'], '-', p['title'])

if __name__ == '__main__':
    main()
