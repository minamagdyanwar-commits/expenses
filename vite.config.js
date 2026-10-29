import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));
// Short commit the build was made from ("dev" if git is unavailable), so a deployed build can be matched to a merge.
const commit = (() => {
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  } catch {
    return 'dev';
  }
})();

// Sources live in src/. The production build is written to the repository root
// (that is what GitHub Pages serves). base './' makes it work on any Pages path.
export default defineConfig({
  root: 'src',
  base: './',
  publicDir: '../public',
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BUILD_COMMIT__: JSON.stringify(commit),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC'),
  },
  build: { outDir: '..', emptyOutDir: false, assetsDir: '.' },
});
