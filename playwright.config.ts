import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/responsive',
  timeout: 30000,
  fullyParallel: false,
  workers: 1,
  reporter: [['list'], ['json', { outputFile: 'tests/responsive/__report__/results.json' }]],
  use: {
    baseURL: 'http://localhost:4790',
    actionTimeout: 10000,
  },
  webServer: {
    command: 'npx craco start',
    url: 'http://localhost:4790',
    reuseExistingServer: false,
    timeout: 120000,
    env: { REACT_APP_VISUAL_MOCK: '1', PORT: '4790', BROWSER: 'none', CI: 'true' },
  },
});
