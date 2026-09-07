import { normalizeIntlLocale } from './normalizeIntlLocale';

describe('normalizeIntlLocale', () => {
  it('converts underscore locale codes to BCP 47 tags', () => {
    expect(normalizeIntlLocale('de_DE')).toBe('de-DE');
    expect(normalizeIntlLocale('en_US')).toBe('en-US');
  });

  it('leaves hyphenated locale codes unchanged', () => {
    expect(normalizeIntlLocale('de-DE')).toBe('de-DE');
    expect(normalizeIntlLocale('en-US')).toBe('en-US');
  });
});
