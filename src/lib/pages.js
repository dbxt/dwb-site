// Build-time page inventory, read from the page sources themselves. Feeds the home page "Latest" list and sitemap.xml,
// so neither needs a hand-edited file or a script that rewrites source in CI.
const sources = import.meta.glob('/src/pages/**/index.astro', { query: '?raw', import: 'default', eager: true });

export const SITE = 'https://davidwaynebaxter.com';

const SECTIONS = { ideas: 'Ideas', ai: 'AI Work', lab: 'Engineering Lab', fun: 'Fun' };

/** Every indexable page: { file, path ("/ai/"), source }. 404.astro is not an index.astro, so it is never listed. */
export const pages = Object.entries(sources).map(([file, source]) => {
  const rel = file.slice('/src/pages/'.length, -'index.astro'.length);
  return { file: file.slice(1), path: '/' + rel, source };
});

function articleOf(page) {
  const m = page.source.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  if (!m) return null;
  let data;
  try { data = JSON.parse(m[1]); } catch (e) { throw new Error(`Invalid JSON-LD in ${page.file}: ${e.message}`); }
  const node = (data['@graph'] ?? [data]).find((n) => ['Article', 'TechArticle'].includes(n['@type']) && n.datePublished && n.headline);
  return node ?? null;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const decode = (s) => s.replace(/&rsquo;|&#8217;/g, '\u2019').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");

/** The newest Article/TechArticle pages in Ideas, AI Work, Engineering Lab and Fun (section index pages carry no Article). */
export function latest(count = 3) {
  return pages
    .map((p) => ({ p, section: SECTIONS[p.path.split('/')[1]], node: articleOf(p) }))
    .filter((x) => x.section && x.node)
    .map(({ p, section, node }) => {
      const [y, m, d] = node.datePublished.split('-').map(Number);
      return { url: p.path, section, title: decode(node.headline), date: node.datePublished, label: `${MONTHS[m - 1]} ${d}, ${y}` };
    })
    .sort((a, b) => b.date.localeCompare(a.date) || a.url.localeCompare(b.url))
    .slice(0, count);
}
