import { describe, expect, it } from 'vitest';

import { buildTagsQuery, normalizeTagGroups, TagsFilterValidationError } from './tags-filter';

describe('normalizeTagGroups', () => {
  it('returns empty for undefined or empty', () => {
    expect(normalizeTagGroups(undefined)).toEqual([]);
    expect(normalizeTagGroups([])).toEqual([]);
  });

  it('wraps legacy flat list as one OR-group', () => {
    expect(normalizeTagGroups(['a', 'b'])).toEqual([['a', 'b']]);
  });

  it('preserves CNF nested form', () => {
    expect(
      normalizeTagGroups([
        ['a', 'b'],
        ['c'],
      ])
    ).toEqual([
      ['a', 'b'],
      ['c'],
    ]);
  });

  it('rejects empty inner groups', () => {
    expect(() => normalizeTagGroups([[], ['a']])).toThrow(TagsFilterValidationError);
  });

  it('rejects non-array values (e.g. string is iterable and must not be treated as tag list)', () => {
    expect(() => normalizeTagGroups('not-an-array' as never)).toThrow(TagsFilterValidationError);
  });
});

describe('buildTagsQuery', () => {
  it('returns empty object for no groups', () => {
    expect(buildTagsQuery([])).toEqual({});
  });

  it('uses single $in for one group', () => {
    expect(buildTagsQuery([['x', 'y']])).toEqual({ tags: { $in: ['x', 'y'] } });
  });

  it('uses $and of $in for multiple groups', () => {
    expect(
      buildTagsQuery([
        ['a', 'b'],
        ['c'],
      ])
    ).toEqual({
      $and: [{ tags: { $in: ['a', 'b'] } }, { tags: { $in: ['c'] } }],
    });
  });
});
