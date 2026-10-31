// SPDX-License-Identifier: GPL-3.0-only
import { mount } from 'svelte';
import App from './app/App.svelte';
import './app/styles.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/space-grotesk/600.css';
import '@fontsource/space-grotesk/700.css';
import '@fontsource/jetbrains-mono/400.css';
mount(App, { target: document.getElementById('app')! });
