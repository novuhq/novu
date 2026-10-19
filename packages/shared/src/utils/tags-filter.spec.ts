import { describe, expect, it } from 'vitest';

import { buildTagsQuery, normalizeTagGroups, TagsFilterValidationError } from './tags-filter';

describe('normalizeTagGroups', () => {
  it('returns empty for undefined or empty', () => {
    expect(normalizeTagGroups(undefined)).toEqual([]);
    expect(normalizeTagGroups([])).toEqual([]);
  });

  it('wraps flat string[] as one OR-group', () => {
    expect(normalizeTagGroups(['a', 'b'])).toEqual([['a', 'b']]);
  });

  it('normalizes explicit { or }', () => {
    expect(normalizeTagGroups({ or: ['a', 'b'] })).toEqual([['a', 'b']]);
  });

  it('returns empty for { or: [] }', () => {
    expect(normalizeTagGroups({ or: [] })).toEqual([]);
  });

  it('normalizes explicit { and: [{ or }, ...] }', () => {
    expect(
      normalizeTagGroups({
        and: [{ or: ['a', 'b'] }, { or: ['c'] }],
      })
    ).toEqual([['a', 'b'], ['c']]);
  });

  it('returns empty for { and: [] }', () => {
    expect(normalizeTagGroups({ and: [] })).toEqual([]);
  });

  it('rejects nested string[][]', () => {
    expect(() => normalizeTagGroups([['a', 'b'], ['c']] as never)).toThrow(TagsFilterValidationError);
  });

  it('rejects both or and and on the same object', () => {
    expect(() => normalizeTagGroups({ or: ['a'], and: [{ or: ['b'] }] } as never)).toThrow(TagsFilterValidationError);
  });

  it('rejects empty inner group in and', () => {
    expect(() => normalizeTagGroups({ and: [{ or: ['a'] }, { or: [] }] })).toThrow(TagsFilterValidationError);
  });

  it('rejects non-array values (e.g. string is iterable and must not be treated as tag list)', () => {
    expect(() => normalizeTagGroups('not-an-array' as never)).toThrow(TagsFilterValidationError);
  });

  it('rejects null', () => {
    expect(() => normalizeTagGroups(null as never)).toThrow(TagsFilterValidationError);
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
    expect(buildTagsQuery([['a', 'b'], ['c']])).toEqual({
      $and: [{ tags: { $in: ['a', 'b'] } }, { tags: { $in: ['c'] } }],
    });
  });
});
