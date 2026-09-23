import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { playwright } from '@vitest/browser-playwright'

export default defineConfig({
  plugins: [react()],
  test: {
    projects: [
      { extends: true, test: { name: 'core', include: ['src/**/*.test.ts'], environment: 'node' } },
      {
        extends: true,
        test: {
          name: 'ui',
          include: ['src/**/*.test.tsx'],
          setupFiles: ['src/ui/test-setup.ts'],
          browser: {
            enabled: true,
            headless: true,
            // system Chrome: the Playwright CDN download is blocked on this machine
            provider: playwright({ launchOptions: { channel: 'chrome' } }),
            instances: [{ browser: 'chromium', viewport: { width: 390, height: 844 } }],
          },
        },
      },
    ],
  },
})
