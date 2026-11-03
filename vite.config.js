import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';

// Injects <title>, meta and palette tokens from content.json so the shell has no hardcoded copy.
const fromContent = () => ({
  name: 'from-content',
  transformIndexHtml(html) {
    const { meta, palette } = JSON.parse(readFileSync('./src/content.json', 'utf8'));
    const tokens = Object.entries(palette).map(([k, v]) => `--${k}:${v}`).join(';');
    const head = `<title>${meta.title}</title>
    <meta name="description" content="${meta.description}" />
    <meta property="og:title" content="${meta.title}" />
    <meta property="og:description" content="${meta.description}" />
    <meta property="og:url" content="${meta.url}" />
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
