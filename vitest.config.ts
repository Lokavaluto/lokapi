/// <reference types="vitest" />
import { defineConfig } from 'vite'
import { doctest } from 'vite-plugin-doctest'

const cfg =  defineConfig({
    plugins: [doctest()],
    test: {
        includeSource: ['src/**/*.{js,ts}'],
        setupFiles: ['./tests/setup.ts'],
        environment: 'jsdom',
        passWithNoTests: true,
        bail: 1,
    },
})

export default cfg