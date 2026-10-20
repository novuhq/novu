import { describe, expect, it } from 'vitest';
import type { DocsPage } from './docs-index';
import { highlightMatches, searchDocs, tokenizeQuery } from './docs-search';

const PAGES: DocsPage[] = [
  { title: 'Delay step', path: '/delay', keywords: ['wait'] },
  { title: 'Schedule a delay from payload values', path: '/delay#payload', keywords: [] },
  { title: 'Digest step', path: '/digest', keywords: ['batch'] },
  { title: 'Email providers', path: '/email', keywords: ['sendgrid'] },
  { title: 'Relay settings', path: '/relay', keywords: [] },
];

describe('tokenizeQuery', () => {
  it('lowercases, drops stop words and short tokens, and dedupes', () => {
    expect(tokenizeQuery('How do I add a Delay, delay?')).toEqual(['add', 'delay']);
  });

  it('returns no tokens for whitespace or punctuation only', () => {
    expect(tokenizeQuery('  ?! ')).toEqual([]);
  });
});

describe('highlightMatches', () => {
  it('highlights tokens at word starts only', () => {
    expect(highlightMatches('Relay and delay', ['delay'])).toEqual([
      { text: 'Relay and ', isMatch: false },
      { text: 'delay', isMatch: true },
    ]);
  });

  it('keeps the original casing and merges overlapping ranges', () => {
    expect(highlightMatches('Delay step', ['del', 'delay'])).toEqual([
      { text: 'Delay', isMatch: true },
      { text: ' step', isMatch: false },
    ]);
  });

  it('escapes regular expression characters in tokens', () => {
    expect(highlightMatches('C++ SDK', ['c++'])).toEqual([
      { text: 'C++', isMatch: true },
      { text: ' SDK', isMatch: false },
    ]);
  });
});

describe('searchDocs', () => {
  it('ranks title matches above keyword matches and keeps index order on ties', () => {
    const results = searchDocs('delay before email', PAGES, 5).map((result) => result.page.path);

    expect(results).toEqual(['/delay', '/delay#payload', '/email']);
  });

  it('matches keywords when the title does not match', () => {
    expect(searchDocs('batch', PAGES, 5).map((result) => result.page.path)).toEqual(['/digest']);
  });

  it('respects the limit', () => {
    expect(searchDocs('step', PAGES, 1)).toHaveLength(1);
  });

  it('returns nothing for an empty query', () => {
    expect(searchDocs('   ', PAGES, 5)).toEqual([]);
  });

  it('does not match inside words', () => {
    expect(searchDocs('elay', PAGES, 5)).toEqual([]);
  });
});
