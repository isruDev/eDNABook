// Generates the README screenshot walkthrough: `npm run screenshots`.
// Output: docs/walkthrough/*.png (phone-sized, with a simulated GPS fix).
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: 'walkthrough.shots.js',
  timeout: 60000,
  outputDir: '../../test-results/walkthrough',
  metadata: { outDir: 'docs/walkthrough' },
  use: {
    baseURL: 'http://localhost:8080',
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    colorScheme: process.env.SCHEME === 'dark' ? 'dark' : 'light',
    permissions: ['geolocation'],
    geolocation: { latitude: 44.5653, longitude: -76.3247, accuracy: 6 },
  },
  webServer: {
    command: 'python -m http.server 8080',
    cwd: '../..',
    port: 8080,
    reuseExistingServer: true,
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
});
