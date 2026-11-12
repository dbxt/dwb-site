import { articles } from './articles.js';

const SITE = 'https://davidwaynebaxter.com';
const AUTHOR = { '@type': 'Person', name: 'David Wayne Baxter', url: SITE + '/' };

/** BreadcrumbList from [[name, "/path/"], ...], Home first. */
export const crumbs = (items) => ({
  '@type': 'BreadcrumbList',
  itemListElement: items.map(([name, path], i) => ({ '@type': 'ListItem', position: i + 1, name, item: SITE + path })),
});

/** Article / TechArticle node for a page registered in articles.js. */
export function article(path) {
  const a = articles[path];
  if (!a) throw new Error(`No article metadata registered for ${path} in src/lib/articles.js`);
  return {
    '@type': a.type,
    headline: a.headline,
    description: a.description,
    image: SITE + a.image,
    url: SITE + path,
    mainEntityOfPage: SITE + path,
    author: AUTHOR,
    datePublished: a.published,
    dateModified: a.modified,
  };
}

/** Serialised JSON-LD document for <Base schema={...}>. "<" is escaped so the data can never close the script tag. */
export const ldJson = (nodes) => JSON.stringify({ '@context': 'https://schema.org', '@graph': nodes }).replace(/</g, '\\u003c');
