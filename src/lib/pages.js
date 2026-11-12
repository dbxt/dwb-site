// Build-time page inventory, read from the page sources themselves. Feeds the home page "Latest" list and sitemap.xml,
// so neither needs a hand-edited file or a script that rewrites source in CI.
import { articles } from './articles.js';

const sources = import.meta.glob('/src/pages/**/index.astro', { query: '?raw', import: 'default', eager: true });

export const SITE = 'https://davidwaynebaxter.com';

const SECTIONS = { ideas: 'Ideas', ai: 'AI Work', lab: 'Engineering Lab', fun: 'Fun' };

/** Every indexable page: { file, path ("/ai/"), source }. 404.astro is not an index.astro, so it is never listed. */
export const pages = Object.entries(sources).map(([file, source]) => {
  const rel = file.slice('/src/pages/'.length, -'index.astro'.length);
  return { file: file.slice(1), path: '/' + rel, source };
});

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const decode = (s) => s.replace(/&rsquo;|&#8217;/g, '\u2019').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");

/** The newest Article/TechArticle pages in Ideas, AI Work, Engineering Lab and Fun (from articles.js). */
export function latest(count = 3) {
  return Object.entries(articles)
    .map(([url, a]) => ({ url, section: SECTIONS[url.split('/')[1]], a }))
    .filter((x) => x.section)
    .map(({ url, section, a }) => {
      const [y, m, d] = a.published.split('-').map(Number);
      return { url, section, title: decode(a.headline), date: a.published, label: `${MONTHS[m - 1]} ${d}, ${y}` };
    })
    .sort((x, y) => y.date.localeCompare(x.date) || x.url.localeCompare(y.url))
    .slice(0, count);
}
