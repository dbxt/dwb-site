import { execFileSync } from 'node:child_process';
import { pages, SITE } from '../lib/pages.js';

// changefreq / priority per URL (kept from the old hand-written sitemap).
const META = {
  '/': ['weekly', '1.0'], '/experience/': ['monthly', '0.8'], '/ai/': ['monthly', '0.8'],
  '/ai/signaldrift/': ['monthly', '0.7'], '/ai/homepage/': ['monthly', '0.7'], '/ai/bug-manager/': ['monthly', '0.7'],
  '/ai/drop-shipping-automation/': ['monthly', '0.7'], '/ai/em-dashboard/': ['monthly', '0.7'],
  '/now/': ['monthly', '0.6'], '/contact/': ['monthly', '0.6'], '/connect/': ['monthly', '0.6'],
  '/lab/': ['monthly', '0.6'], '/lab/service-host-migration/': ['monthly', '0.5'], '/lab/proxmox/': ['monthly', '0.5'],
  '/lab/proxmox/opnsense/': ['monthly', '0.4'], '/lab/proxmox/docker-host/': ['monthly', '0.4'],
  '/lab/proxmox/home-assistant/': ['monthly', '0.4'], '/experience/content-delivery-service/': ['monthly', '0.6'],
  '/ideas/': ['weekly', '0.7'], '/ideas/innovation-sprint/': ['monthly', '0.6'],
  '/ideas/ai-and-engineering-leadership/': ['monthly', '0.6'], '/ideas/ai-trust-bottleneck/': ['monthly', '0.6'],
  '/ideas/what-keeps-engineers/': ['monthly', '0.6'], '/fun/': ['weekly', '0.5'], '/fun/the-kindness-claus/': ['yearly', '0.4'],
};

const git = (...args) => {
  try { return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }); } catch { return ''; }
};

// lastmod = the date the page's source last changed in git, or today if it has uncommitted edits. Commits marked
// [skip-lastmod] changed how a page is built, not what it says, so they do not move the date. Needs full git history
// (CI checks out with fetch-depth: 0); without history the <lastmod> element is simply omitted.
const dirty = new Set(git('status', '--porcelain').split('\n').filter(Boolean).map((l) => l.slice(3)));
const today = new Date().toISOString().slice(0, 10);

function lastmod(page) {
  if (dirty.has(page.file)) return today;
  const legacy = page.path.slice(1) + 'index.html'; // pre-Astro location; its history still counts
  return git('log', '-1', '--format=%cs', '--invert-grep', '--grep=\\[skip-lastmod\\]', '--', page.file, legacy).trim() || null;
}

export function GET() {
  const entries = pages
    .filter((p) => !/robots="noindex/.test(p.source))
    .sort((a, b) => Object.keys(META).indexOf(a.path) - Object.keys(META).indexOf(b.path))
    .map((p) => {
      const [freq, prio] = META[p.path] ?? ['monthly', '0.5'];
      const mod = lastmod(p);
      return `  <url>\n    <loc>${SITE}${p.path}</loc>\n${mod ? `    <lastmod>${mod}</lastmod>\n` : ''}    <changefreq>${freq}</changefreq>\n    <priority>${prio}</priority>\n  </url>`;
    });
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join('\n')}\n</urlset>\n`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml' } });
}
