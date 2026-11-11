import { defineConfig, type Plugin } from 'vite';

// Strict CSP for the production build only (Vite dev injects inline styles).
const csp: Plugin = {
  name: 'csp', apply: 'build',
  transformIndexHtml: (html) => html.replace('<meta charset="utf-8">',
    `<meta charset="utf-8">\n  <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; manifest-src 'self'; worker-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'">`),
};

export default defineConfig({
  base: './',
  plugins: [csp],
  build: { target: 'es2017', assetsInlineLimit: 0, cssCodeSplit: false },
  test: { include: ['tests/unit/**/*.test.ts'] },
} as never);
