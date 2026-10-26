import { describe, expect, it } from 'vitest';

import { noindexPaths, SITE_INDEXED, searchEnginesMayIndex, siteNoindex } from './seo';

describe('SITE_NOINDEX', () => {
  it('is on only for true or 1', () => {
    expect(siteNoindex(undefined)).toBe(false);
    expect(siteNoindex('')).toBe(false);
    expect(siteNoindex('false')).toBe(false);
    expect(siteNoindex('true')).toBe(true);
    expect(siteNoindex(' TRUE ')).toBe(true);
    expect(siteNoindex('1')).toBe(true);
  });

  it('noindexes every route on staging, preview, and development', () => {
    expect(noindexPaths('production', true)).toBe('all');
    expect(noindexPaths('preview', false)).toBe('all');
    expect(noindexPaths('development', false)).toBe('all');
    expect(noindexPaths('production', false)).toBe(SITE_INDEXED ? 'none' : 'website');
  });

  it('keeps staging out of search results after the site may be indexed', () => {
    expect(searchEnginesMayIndex('production', true, true)).toBe(false);
    expect(searchEnginesMayIndex('production', false, true)).toBe(true);
    expect(searchEnginesMayIndex('preview', false, true)).toBe(false);
    expect(searchEnginesMayIndex('development', false, true)).toBe(false);
    expect(searchEnginesMayIndex('production', false, false)).toBe(false);
  });
});
