import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  // The CLI serves the built studio at the root of a localhost origin, so its
  // assets are addressed from '/'. The GitHub Pages deploy lives under
  // https://pchrysostomou.github.io/moirae/, so .github/workflows/pages.yml
  // builds with `--mode pages` and the assets are addressed from '/moirae/'.
  base: mode === 'pages' ? '/moirae/' : '/',
  // The dev server serves the repo's out/ directory, where `pnpm examples`
  // writes the example traces: open ?trace=clean-partition.jsonl. Traces are
  // regenerated, never bundled; the Pages workflow copies them next to the
  // built studio so the same relative URL resolves there.
  publicDir: '../../out',
  build: { copyPublicDir: false },
}));
