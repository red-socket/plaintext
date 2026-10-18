// @ts-check
import { defineConfig } from 'astro/config';
import { satteri } from '@astrojs/markdown-satteri';

import svelte from '@astrojs/svelte';
import mdx from '@astrojs/mdx';
import { basePath } from './plugins/base-path.mjs';

// Served from the domain root by default. The GitHub Pages workflow sets SITE_URL and BASE_PATH,
// because Pages serves the site under /plaintext.
const base = process.env.BASE_PATH || '/';

// https://astro.build/config
export default defineConfig({
  site: process.env.SITE_URL,
  base,
  markdown: { processor: satteri({ mdastPlugins: [basePath(base)] }) },
  integrations: [svelte(), mdx()],
});
