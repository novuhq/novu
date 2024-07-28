import { describe, expect, it } from 'vitest';
import { cloneData } from './clone.utils';

describe('cloneData', () => {
  type TestCase = {
    name: string;
    data: unknown;
  };

  const testCases: TestCase[] = [
    {
      name: 'object',
      data: { a: 1, b: 2 },
    },
    {
      name: 'array',
      data: [1, 2, 3],
    },
    {
      name: 'string',
      data: 'hello',
    },
    {
      name: 'number',
      data: 1,
    },
    {
      name: 'boolean',
      data: true,
    },
    {
      name: 'null',
      data: null,
    },
    {
      name: 'undefined',
      data: undefined,
    },
    {
      name: 'nested-object',
      data: { a: { b: { c: 1 } } },
    },
    {
      name: 'nested-array',
      data: [1, [2, [3, [4, [5]]]]],
    },
  ];

  testCases.forEach(({ name, data }) => {
    it(`should deep clone a ${name}`, () => {
      const cloned = cloneData(data);
      expect(cloned).toEqual(data);
    });
  });

  it('should clone such that the mutating the orginal data does not affect the cloned data', () => {
    const data = { a: 1, b: 2 };
    const cloned = cloneData(data);
    data.a = 2;
    expect(cloned).toEqual({ a: 1, b: 2 });
  });
});
