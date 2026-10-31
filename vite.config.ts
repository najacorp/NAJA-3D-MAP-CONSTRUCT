// SPDX-License-Identifier: GPL-3.0-only
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
export default defineConfig({ plugins: [svelte()], base: './', server: { strictPort: true } });
