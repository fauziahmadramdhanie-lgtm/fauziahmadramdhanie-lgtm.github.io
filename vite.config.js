import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';
import { esc } from './src/esc.js';

// Injects <title>, meta and palette tokens from content.json so the shell has no hardcoded copy.
const fromContent = () => ({
  name: 'from-content',
  transformIndexHtml(html) {
    const { meta, palette } = JSON.parse(readFileSync('./src/content.json', 'utf8'));
    const image = new URL('og.png', meta.url).href; // public/og.png, 1200x630
    const tokens = Object.entries(palette).map(([k, v]) => `--${k}:${v}`).join(';');
    const head = `<title>${esc(meta.title)}</title>
    <meta name="description" content="${esc(meta.description)}" />
    <meta property="og:title" content="${esc(meta.title)}" />
    <meta property="og:description" content="${esc(meta.description)}" />
    <meta property="og:url" content="${esc(meta.url)}" />
    <meta property="og:type" content="website" />
    <meta property="og:image" content="${esc(image)}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${esc(meta.title)}" />
    <meta name="twitter:description" content="${esc(meta.description)}" />
    <meta name="twitter:image" content="${esc(image)}" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <style>:root{${tokens}}</style>`;
    return html.replace('<!--head-->', head).replace('%LANG%', meta.language);
  },
});

// User site (<username>.github.io): base '/'.
// Project site (<username>.github.io/<repo>): set BASE_PATH=/<repo>/ at build time.
export default defineConfig({
  base: process.env.BASE_PATH || '/',
  plugins: [fromContent()],
  build: { target: 'es2020', sourcemap: false },
});
