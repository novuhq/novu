import type { DocsPage } from './docs-index';

export type HighlightSegment = {
  text: string;
  isMatch: boolean;
};

export type DocsSearchResult = {
  page: DocsPage;
  segments: HighlightSegment[];
};

const TITLE_MATCH_SCORE = 3;
const KEYWORD_MATCH_SCORE = 1;

const STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'are',
  'can',
  'do',
  'does',
  'for',
  'how',
  'i',
  'in',
  'is',
  'it',
  'my',
  'of',
  'on',
  'or',
  'the',
  'to',
  'what',
  'with',
]);

export function tokenizeQuery(query: string): string[] {
  const tokens = query
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token));

  return Array.from(new Set(tokens));
}

/** Letters and numbers. `\p{}` is supported since Safari 11; lookbehind is not, until 16.4. */
function isWordCharacter(character: string | undefined): boolean {
  return character !== undefined && /[\p{L}\p{N}]/u.test(character);
}

/**
 * Indexes where `token` begins a word. Case-insensitive, and literal, so characters like `+`
 * stay searchable. Avoids lookbehind, which throws in Safari 14–16.3 while the results render.
 */
function findWordStartRanges(text: string, token: string): Array<[number, number]> {
  const haystack = text.toLowerCase();
  const needle = token.toLowerCase();

  if (needle.length === 0 || needle.length > haystack.length) {
    return [];
  }

  const ranges: Array<[number, number]> = [];
  let from = 0;

  while (from <= haystack.length - needle.length) {
    const index = haystack.indexOf(needle, from);

    if (index === -1) {
      break;
    }

    if (!isWordCharacter(haystack[index - 1])) {
      ranges.push([index, index + needle.length]);
    }

    from = index + 1;
  }

  return ranges;
}

function findMatchRanges(text: string, tokens: string[]): Array<[number, number]> {
  const ranges = tokens.flatMap((token) => findWordStartRanges(text, token));

  ranges.sort((a, b) => a[0] - b[0]);

  const merged: Array<[number, number]> = [];

  for (const range of ranges) {
    const last = merged[merged.length - 1];

    if (last && range[0] <= last[1]) {
      last[1] = Math.max(last[1], range[1]);
    } else {
      merged.push([range[0], range[1]]);
    }
  }

  return merged;
}

export function highlightMatches(text: string, tokens: string[]): HighlightSegment[] {
  const ranges = findMatchRanges(text, tokens);
  const segments: HighlightSegment[] = [];
  let cursor = 0;

  for (const [start, end] of ranges) {
    if (start > cursor) {
      segments.push({ text: text.slice(cursor, start), isMatch: false });
    }

    segments.push({ text: text.slice(start, end), isMatch: true });
    cursor = end;
  }

  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor), isMatch: false });
  }

  return segments;
}

function scorePage(page: DocsPage, tokens: string[]): number {
  let score = 0;

  for (const token of tokens) {
    if (findWordStartRanges(page.title, token).length > 0) {
      score += TITLE_MATCH_SCORE;
    } else if (page.keywords.some((keyword) => findWordStartRanges(keyword, token).length > 0)) {
      score += KEYWORD_MATCH_SCORE;
    }
  }

  return score;
}

export function searchDocs(query: string, pages: DocsPage[], limit: number): DocsSearchResult[] {
  const tokens = tokenizeQuery(query);

  if (tokens.length === 0) {
    return [];
  }

  return pages
    .map((page, index) => ({ page, index, score: scorePage(page, tokens) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, limit)
    .map(({ page }) => ({ page, segments: highlightMatches(page.title, tokens) }));
}
