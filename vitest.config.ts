import { defineConfig } from 'vitest/config'

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        // Pin the timezone so date tests give the same answer on every machine, not only on
        // CI (which runs in UTC).
        env: { TZ: 'UTC' },
        include: ['**/*.test.ts'],
        setupFiles: ['./src/test-utils/transport-seam.ts', './src/test-utils/msw-setup.ts'],
        clearMocks: true,
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
        },
    },
})
