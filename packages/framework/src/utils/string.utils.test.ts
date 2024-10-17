import { expect, it, describe } from 'vitest';
import { stringifyDataStructureWithSingleQuotes, toConstantCase } from './string.utils';

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

describe('stringifyDataStructureWithSingleQuotes', () => {
  it('should convert a simple array to a string with single quotes', () => {
    const myTestArray = ['a', 'b', 'c'];
    const converted = stringifyDataStructureWithSingleQuotes(myTestArray);
    expect(converted).toStrictEqual("['a','b','c']");
  });

  it('should convert an array with nested objects to a string with single quotes', () => {
    const myTestObject = [{ text: 'cat' }, { text: 'dog' }];
    const converted = stringifyDataStructureWithSingleQuotes(myTestObject);
    expect(converted).toStrictEqual("[{'text':'cat'},{'text':'dog'}]");
  });

  it('should convert an object with nested objects to a string with single quotes', () => {
    const myTestObject = { comments: [{ text: 'cat' }, { text: 'dog' }] };
    const converted = stringifyDataStructureWithSingleQuotes(myTestObject);
    expect(converted).toStrictEqual("{'comments':[{'text':'cat'},{'text':'dog'}]}");
  });

  it('should convert an object with nested objects to a string with single quotes and spaces', () => {
    const myTestObject = { comments: [{ text: 'cat' }, { text: 'dog' }] };
    const converted = stringifyDataStructureWithSingleQuotes(myTestObject, 2);
    expect(converted).toStrictEqual(
      `{\\n  'comments': [\\n    {\\n      'text': 'cat'\\n    },\\n    {\\n      'text': 'dog'\\n    }\\n  ]\\n}`
    );
  });

  it('should convert a string to a string without single quotes', () => {
    const myTestString = 'hello';
    const converted = stringifyDataStructureWithSingleQuotes(myTestString);
    expect(converted).toStrictEqual('hello');
  });

  it('should convert a number to a string without single quotes', () => {
    const myTestNumber = 123;
    const converted = stringifyDataStructureWithSingleQuotes(myTestNumber);
    expect(converted).toStrictEqual('123');
  });

  it('should convert a boolean to a string without single quotes', () => {
    const myTestBoolean = true;
    const converted = stringifyDataStructureWithSingleQuotes(myTestBoolean);
    expect(converted).toStrictEqual('true');
  });

  it('should convert null to a string without single quotes', () => {
    const myTestNull = null;
    const converted = stringifyDataStructureWithSingleQuotes(myTestNull);
    expect(converted).toStrictEqual('null');
  });

  it('should convert undefined to an empty string', () => {
    const myTestUndefined = undefined;
    const converted = stringifyDataStructureWithSingleQuotes(myTestUndefined);
    expect(converted).toStrictEqual('undefined');
  });
});
