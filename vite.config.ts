import { defineConfig } from 'vite';

// GitHub Pages serves this project from /starship-flight-15-sim/.
export default defineConfig({
  base: process.env.GITHUB_PAGES ? '/starship-flight-15-sim/' : '/',
});
