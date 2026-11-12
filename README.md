# davidwaynebaxter.com

Static site built with [Astro](https://astro.build). Every page is plain HTML at build time. There is no client-side
framework; the only scripts are the theme/menu toggle and Google Analytics with web-vitals reporting.

## Layout

```
public/                 Served as-is at the site root: assets/ (images, fonts, vitals.js), robots.txt, _redirects and
                        _headers (Cloudflare Pages), .htaccess (legacy FTPS host), favicons, manifest, IndexNow key
src/layouts/Base.astro  Document shell: head metadata, share cards, analytics, header, footer
src/lib/                articles.js (article metadata), schema.js (JSON-LD helpers), pages.js (page inventory for
                        the sitemap and the home page Latest list)
src/scripts/theme.js    Theme and mobile-menu toggle (bundled by Astro)
src/components/         SiteHeader, SiteFooter, Crumbs (scoped styles live inside each), Analytics
src/pages/              One folder per URL: src/pages/ai/signaldrift/index.astro -> /ai/signaldrift/
src/styles/             tokens.css, base.css, sections.css load on every page; the rest load only where used
functions/              Cloudflare Pages middleware (www -> apex redirect)
tools/                  check-dist.py (post-build checks), IndexNow, Lighthouse budgets, share-card renderer
```

## Commands

```
npm install
npm run dev        # http://localhost:4321
npm run build      # static output in dist/
npm run preview    # serve dist/
```

Requires Node 22.23.4 or newer.

## Writing a page

Copy a similar page folder. The frontmatter props on `<Base>` set the title, description, canonical path, share-card
image and which primary-nav link is highlighted (`navCurrent`, plus `navKind="page"` for the section's own page and
`"true"` for pages inside it). The body is the `<main id="main">` markup.

**Structured data** is built in the page frontmatter and passed as `schema={schema}`: `crumbs([["Home", "/"], ...])`
for breadcrumbs, `article("/ideas/my-essay/")` for an Article or TechArticle, or a plain object for other types.
Article pages must be registered in `src/lib/articles.js` (headline, description, image, published and modified dates);
that file also feeds the home page "Latest" list, and `article()` fails the build if a page is missing from it.

## Styles

- **Global (every page):** `tokens.css` (fonts, colour variables, light and dark), `base.css` (reset, type, links,
  buttons), `sections.css` (ruled rows, spec lists, page heads, notes, figures).
- **Scoped components:** `SiteHeader`, `SiteFooter` and `Crumbs` carry their own `<style>`. Astro scopes these to the
  component, so they cannot leak into page content.
- **Feature sheets:** `essay.css`, `guides.css`, `tables.css`, `projects.css`, `casestudy.css`, `workflow.css`,
  `results.css`. Import one at the top of a page that needs it. Order matters only where two sheets style the same
  element, so keep imports in the order shown here.
- **Single-page styles:** the home, Experience and Engineering Lab pages (and Connect) keep rules used by nothing else
  in a `<style>` block at the bottom of that page, scoped to it.

## Generated at build time

- **sitemap.xml** comes from `src/pages/sitemap.xml.js`. It lists every `index.astro` page that is not `noindex`, with
  `<lastmod>` taken from git (the last commit that touched the page, or today if it has uncommitted edits). Add
  `[skip-lastmod]` to a commit message when a change does not alter page content. New pages need a `changefreq` and
  `priority` entry in the `META` table in that file, or they get monthly / 0.5.
- **Home page "Latest"** shows the three newest entries in `src/lib/articles.js` that sit under Ideas, AI Work,
  Engineering Lab or Fun.

## Checks

`python3 tools/check-dist.py` (after `npm run build`) fails on broken internal links, a missing title, description,
canonical or single `<h1>`, em dashes in page text, unresolved placeholders, and references to retired analytics hosts.
CI runs it before anything is published.

## Redirects and headers live in two places

Cloudflare Pages reads `public/_redirects` and `public/_headers`; the legacy FTPS host reads `public/.htaccess`.
Change both when you add a redirect, a security header or the Content-Security-Policy. If a new third-party script,
embed or font is added, update the CSP in both files too.

## Deploys

One workflow (`.github/workflows/deploy.yml`) builds once and feeds both hosts:

- `dev` branch: build, checks, Cloudflare Pages preview, then an advisory Lighthouse run against the preview.
- `main` branch: the same build and Pages deploy, plus an FTPS upload of `dist/` to the legacy host and an IndexNow
  ping, then the Lighthouse workflow audits the live site against `tools/lighthouserc.json`.
- Third-party Actions are pinned to commit SHAs; bump them deliberately.
