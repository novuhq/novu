import { areTagsEqual, checkNotificationTagFilter, normalizeTagGroups } from './notification-utils';

describe('normalizeTagGroups', () => {
  it('wraps flat tags as one OR-group', () => {
    expect(normalizeTagGroups(['a', 'b'])).toEqual([['a', 'b']]);
  });

  it('normalizes explicit { and: [{ or }] }', () => {
    expect(
      normalizeTagGroups({
        and: [{ or: ['a', 'b'] }, { or: ['c'] }],
      })
    ).toEqual([['a', 'b'], ['c']]);
  });

  it('rejects nested string[][]', () => {
    expect(() => normalizeTagGroups([['a', 'b'], ['c']] as never)).toThrow();
  });

  it('rejects non-array values', () => {
    expect(() => normalizeTagGroups('not-an-array' as never)).toThrow();
  });
});

describe('checkNotificationTagFilter', () => {
  it('returns false for non-array filter values', () => {
    expect(checkNotificationTagFilter(['x'], '' as never)).toBe(false);
    expect(checkNotificationTagFilter(['x'], null as never)).toBe(false);
  });

  it('matches OR for flat filter', () => {
    expect(checkNotificationTagFilter(['x', 'y'], ['y'])).toBe(true);
    expect(checkNotificationTagFilter(['x'], ['y'])).toBe(false);
  });

  it('matches AND of OR-groups for explicit filter', () => {
    expect(
      checkNotificationTagFilter(['a', 'c'], {
        and: [{ or: ['a', 'b'] }, { or: ['c', 'd'] }],
      })
    ).toBe(true);

    expect(
      checkNotificationTagFilter(['a'], {
        and: [{ or: ['a', 'b'] }, { or: ['c', 'd'] }],
      })
    ).toBe(false);
  });
});

describe('areTagsEqual', () => {
  it('treats equivalent flat and explicit { or } as equal', () => {
    expect(areTagsEqual(['a', 'b'], { or: ['a', 'b'] })).toBe(true);
  });

  it('treats duplicate tags in a group as equivalent', () => {
    expect(areTagsEqual(['a', 'a'], ['a'])).toBe(true);
  });

  it('treats duplicate OR-groups as equivalent', () => {
    expect(
      areTagsEqual(
        {
          and: [{ or: ['a'] }, { or: ['a'] }],
        },
        { and: [{ or: ['a'] }] }
      )
    ).toBe(true);
  });

  it('compares order-independently within groups', () => {
    expect(
      areTagsEqual(
        {
          and: [{ or: ['b', 'a'] }, { or: ['c'] }],
        },
        {
          and: [{ or: ['a', 'b'] }, { or: ['c'] }],
        }
      )
    ).toBe(true);
  });
});
