import { defineConfig } from 'vite';

// User site (<username>.github.io): base '/'.
// Project site (<username>.github.io/<repo>): set BASE_PATH=/<repo>/ at build time.
export default defineConfig({
  base: process.env.BASE_PATH || '/',
  build: { target: 'es2020', sourcemap: false },
});
