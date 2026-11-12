import { defineConfig } from 'astro/config';

// Static output only: every page is plain HTML with no client-side framework.
export default defineConfig({
  site: 'https://davidwaynebaxter.com',
  output: 'static',
  trailingSlash: 'always',
  build: { format: 'directory' },
  devToolbar: { enabled: false },
});
