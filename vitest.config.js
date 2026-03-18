import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.js'],
    globals: false,
  },
  resolve: {
    alias: {
      '../lib/html5-qrcode.min.js': resolve('./node_modules/html5-qrcode/html5-qrcode.min.js'),
      '../lib/papaparse.min.js': resolve('./node_modules/papaparse/papaparse.min.js'),
      '../lib/sql-wasm.js': resolve('./node_modules/sql.js/dist/sql-wasm.js'),
    },
  },
});
