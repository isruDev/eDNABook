// Generates manuscript figure screenshots from the deployed app: `npm run figures`.
// Same steps as the README walkthrough, at 3x pixel density, saved to docs/figures/.
// BASE_URL overrides the target, e.g. BASE_URL=http://localhost:8080/ to try it locally.
import { defineConfig } from '@playwright/test';
import walkthrough from './playwright.config.js';

const BASE_URL = process.env.BASE_URL ?? 'https://isrudev.github.io/eDNABook/';
const isLocal = new URL(BASE_URL).hostname === 'localhost';

export default defineConfig({
  ...walkthrough,
  outputDir: '../../test-results/figures',
  metadata: { outDir: 'docs/figures' },
  use: { ...walkthrough.use, baseURL: BASE_URL, deviceScaleFactor: 3 },
  webServer: isLocal ? walkthrough.webServer : undefined,
});
