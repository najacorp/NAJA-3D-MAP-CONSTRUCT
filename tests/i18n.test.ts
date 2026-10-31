// SPDX-License-Identifier: GPL-3.0-only
import { describe, expect, it } from 'vitest';
import i18n, { initialLanguage } from '../src/i18n';
import pt from '../src/i18n/pt-BR.json';
import en from '../src/i18n/en.json';
describe('translations', () => {
  it('chooses Portuguese for Portuguese system locales and English otherwise', () => {
    expect(initialLanguage('pt-PT')).toBe('pt-BR');
    expect(initialLanguage('en-US')).toBe('en');
  });
  it('has the same keys in both languages', () => { expect(Object.keys(pt).sort()).toEqual(Object.keys(en).sort()); });
  it('changes language immediately', async () => { await i18n.changeLanguage('pt-BR'); expect(i18n.t('library')).toBe('Biblioteca'); await i18n.changeLanguage('en'); expect(i18n.t('library')).toBe('Library'); });
});
