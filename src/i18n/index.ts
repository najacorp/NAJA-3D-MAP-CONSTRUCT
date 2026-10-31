// SPDX-License-Identifier: GPL-3.0-only
import i18next from 'i18next';
import pt from './pt-BR.json';
import en from './en.json';
export type Language = 'pt-BR' | 'en';
export function initialLanguage(language: string): Language { return language.toLowerCase().startsWith('pt') ? 'pt-BR' : 'en'; }
i18next.init({ lng: initialLanguage(typeof navigator === 'undefined' ? 'en' : navigator.language), fallbackLng: 'en', resources: { 'pt-BR': { translation: pt }, en: { translation: en } }, initImmediate: false });
export default i18next;
