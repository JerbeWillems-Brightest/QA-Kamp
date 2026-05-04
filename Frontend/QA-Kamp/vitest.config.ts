import { defineConfig } from 'vitest/config'

// If you want to collect coverage with external c8, set C8=true in the environment.
// When C8=true we omit vitest's internal coverage configuration so c8 can instrument
// the code and produce coverage reports. Example (PowerShell):
// $env:C8='true'; npx c8 --reporter=text --reporter=lcov -- npm run test -- --run
const useC8 = String(process.env.C8 || process.env.USE_C8 || '').toLowerCase() === 'true'

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    testTimeout: 10000,
    setupFiles: ['src/setupTests.ts'],
    // when not using c8, enable vitest's internal coverage collection
    ...(useC8 ? {} : {
      coverage: {
        provider: 'v8',
        reporter: ['text', 'lcov', 'html'],
        reportsDirectory: 'coverage',
        all: true,
        include: ['src/**/*.{ts,tsx,js,jsx}'],
        // exclude test setup and any helpers that should not be part of coverage
        exclude: [
          // the config file itself
          'vitest.config.ts',
          './vitest.config.ts',
          '**/vitest.config.ts',
          // setup files
          'src/setupTests.ts',
          './src/setupTests.ts',
          '**/setupTests.*',
          'src/**/setupTests.*',
          // test directories
          'src/**/__tests__/**',
          '**/__tests__/**',
          // explicit patterns for spec/test files
          'src/**/*.spec.{ts,tsx,js,jsx}',
          'src/**/*.test.{ts,tsx,js,jsx}',
          '**/*.spec.{ts,tsx,js,jsx}',
          '**/*.test.{ts,tsx,js,jsx}',
          // fallback
          'src/**/?(*.)+(spec|test).{ts,tsx,js,jsx}',
        ],
      },
    }),
  },
})

