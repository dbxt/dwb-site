# davidwaynebaxter.com

Static site built with [Astro](https://astro.build). Every page is plain HTML at build time. There is no client-side
framework; the only scripts are the theme/menu toggle, analytics and web-vitals reporting.

## Layout

```
public/                 Served as-is at the site root: assets/ (images, fonts, theme.js), robots.txt, sitemap.xml,
                        _redirects, .htaccess (legacy host only), favicons, manifest, IndexNow key
src/layouts/Base.astro  Document shell: head metadata, share cards, analytics, header, footer
src/components/         SiteHeader, SiteFooter, Crumbs (scoped styles live inside each), Analytics
src/pages/              One folder per URL: src/pages/ai/signaldrift/index.astro -> /ai/signaldrift/
src/styles/             tokens.css, base.css, sections.css load on every page; the rest load only where used
functions/              Cloudflare Pages middleware (www -> apex redirect)
tools/                  Sitemap lastmod, home page "Latest" list, IndexNow, share-card renderer
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
`"true"` for pages inside it). Page-specific JSON-LD goes in the `<Fragment slot="head">` block, and the body is the
`<main id="main">` markup.

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

## Deploys

- `dev` branch: GitHub Actions builds the site and publishes a Cloudflare Pages preview.
- `main` branch: the same Pages build, plus an FTPS upload of `dist/` to the legacy host, then Lighthouse.
- Before each build, CI refreshes sitemap `lastmod` dates (`tools/sitemap-lastmod.py`) and the home page's Latest list
  (`tools/latest.py`). Add `[skip-lastmod]` to a commit message when a change does not alter page content.
