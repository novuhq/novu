import { areTagsEqual, checkNotificationTagFilter, normalizeTagGroups } from './notification-utils';

describe('normalizeTagGroups', () => {
  it('wraps flat tags as one OR-group', () => {
    expect(normalizeTagGroups(['a', 'b'])).toEqual([['a', 'b']]);
  });

  it('preserves CNF', () => {
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

  it('rejects non-array values', () => {
    expect(() => normalizeTagGroups('not-an-array' as never)).toThrow();
  });
});

describe('checkNotificationTagFilter', () => {
  it('matches OR for flat filter', () => {
    expect(checkNotificationTagFilter(['x', 'y'], ['y'])).toBe(true);
    expect(checkNotificationTagFilter(['x'], ['y'])).toBe(false);
  });

  it('matches AND of OR-groups for nested filter', () => {
    expect(
      checkNotificationTagFilter(['a', 'c'], [
        ['a', 'b'],
        ['c', 'd'],
      ])
    ).toBe(true);

    expect(
      checkNotificationTagFilter(['a'], [
        ['a', 'b'],
        ['c', 'd'],
      ])
    ).toBe(false);
  });
});

describe('areTagsEqual', () => {
  it('treats equivalent flat and single-group CNF as equal', () => {
    expect(areTagsEqual(['a', 'b'], [['a', 'b']])).toBe(true);
  });

  it('compares CNF order-independently within groups', () => {
    expect(
      areTagsEqual(
        [
          ['b', 'a'],
          ['c'],
        ],
        [
          ['a', 'b'],
          ['c'],
        ]
      )
    ).toBe(true);
  });
});
