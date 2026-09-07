import { describe, expect, it } from 'vitest';
import { deepMerge } from './object.utils';

describe('deepMerge function', () => {
  it('should merge objects and replace arrays correctly', () => {
    const source1 = {
      name: 'John',
      age: 30,
      hobbies: ['reading', 'gaming'],
      address: {
        city: 'New York',
        zip: '10001',
      },
    };

    const source2 = {
      age: 25,
      hobbies: ['cooking', 'traveling'],
      address: {
        zip: '10002',
        country: 'USA',
      },
    };

    const expectedOutput = {
      name: 'John',
      age: 25,
      hobbies: ['cooking', 'traveling'],
      address: {
        city: 'New York',
        zip: '10002',
        country: 'USA',
      },
    };

    expect(deepMerge(source1, source2)).toEqual(expectedOutput);
  });

  it('should merge nested objects and replace arrays correctly', () => {
    const source1 = {
      user: {
        id: 1,
        name: 'Alice',
        preferences: {
          theme: 'dark',
          notifications: true,
          tags: ['work', 'personal'],
        },
      },
    };

    const source2 = {
      user: {
        id: 2,
        preferences: {
          theme: 'light',
          tags: ['travel', 'hobby'],
        },
      },
    };

    const expectedOutput = {
      user: {
        id: 2,
        name: 'Alice',
        preferences: {
          theme: 'light',
          notifications: true,
          tags: ['travel', 'hobby'],
        },
      },
    };

    expect(deepMerge(source1, source2)).toEqual(expectedOutput);
  });
});
