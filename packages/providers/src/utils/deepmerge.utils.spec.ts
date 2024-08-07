import { deepMerge, deepMergeAll } from './deepmerge.utils';

describe('deepmerge', () => {
  it('should merge two objects', () => {
    const obj1 = {
      a: {
        b: 1,
        d: {
          a: 1,
        },
        x: [1, 2, 3],
      },
    };

    const obj2 = {
      a: {
        c: 2,
        d: {
          a: 1,
        },
        x: [3, 4, 5],
      },
    };

    const result = deepMerge(obj1, obj2);

    expect(result).toEqual({
      a: {
        b: 1,
        c: 2,
        d: {
          a: 1,
        },
        x: [1, 2, 3, 3, 4, 5],
      },
    });
  });

  it('should merge a list of objects', () => {
    const obj1 = {
      a: {
        b: 1,
        d: {
          a: 1,
        },
        x: [1, 2, 3],
      },
    };

    const obj2 = {
      a: {
        c: 2,
        d: {
          a: 1,
        },
        x: [3, 4, 5],
      },
    };

    const result = deepMergeAll([obj1, obj2]);

    expect(result).toEqual({
      a: {
        b: 1,
        c: 2,
        d: {
          a: 1,
        },
        x: [1, 2, 3, 3, 4, 5],
      },
    });
  });
});
