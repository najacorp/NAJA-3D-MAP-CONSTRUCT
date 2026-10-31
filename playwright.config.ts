// SPDX-License-Identifier: GPL-3.0-only
import { defineConfig } from '@playwright/test';
export default defineConfig({ testDir:'./tests/e2e', timeout:60000, workers:1, reporter:'list', webServer:{ command:'npm run dev:web', url:'http://127.0.0.1:5173/', reuseExistingServer:!process.env.CI, timeout:30000 } });
