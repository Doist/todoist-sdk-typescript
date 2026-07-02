import { defineConfig } from 'vitest/config'

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        include: ['**/*.test.ts'],
        setupFiles: ['./src/test-utils/transport-seam.ts', './src/test-utils/msw-setup.ts'],
        clearMocks: true,
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
        },
    },
})
