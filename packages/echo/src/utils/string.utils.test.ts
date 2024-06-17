import { expect, it, describe } from 'vitest';
import { toConstantCase } from './string.utils';

describe('convert to constant case', () => {
  it('converts properties correctly', () => {
    const myTestObject = {
      aProperty: 'A_PROPERTY',
      someMoreWords: 'SOME_MORE_WORDS',
      single: 'SINGLE',
      ALLCAPS: 'ALLCAPS',
      StartWithCap: 'START_WITH_CAP',
    };

    Object.entries(myTestObject).reduce((_acc, [prop, value]: [string, string]) => {
      const converted = toConstantCase(prop);
      expect(converted).toEqual(value);

      return '';
    }, '');
  });
});
