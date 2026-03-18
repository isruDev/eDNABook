import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.js'],
    globals: false,
  },
  resolve: {
    alias: [
      { find: /.*\/lib\/html5-qrcode\.min\.js$/, replacement: resolve('./node_modules/html5-qrcode/esm/index.js') },
      { find: /.*\/lib\/papaparse\.min\.js$/, replacement: resolve('./node_modules/papaparse/papaparse.min.js') },
      { find: /.*\/lib\/sql-wasm\.js$/, replacement: resolve('./node_modules/sql.js/dist/sql-wasm.js') },
    ],
  },
});
