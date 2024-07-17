import { it, describe, expect } from 'vitest';
import { sanitizeHtmlInObject } from './sanitize.utils';

const scriptBody = `<script>alert('Hello there')</script>`;

describe('sanitize html in object', () => {
  it('sanitize html', () => {
    const myTestObject = {
      property: scriptBody,
      numberItem: 0,
      nullItem: null,
      emptyObjectItem: {},
      booleanItem: true,
      listOfStrings: [scriptBody, scriptBody],
      moreProperties: {
        property: scriptBody,
        listOfStrings: [scriptBody, scriptBody],
      },
      listOfObjects: [{ property: scriptBody }, { property: scriptBody }],
    };

    const result = sanitizeHtmlInObject(myTestObject);

    expect(result).toStrictEqual({
      property: '',
      numberItem: 0,
      nullItem: null,
      emptyObjectItem: {},
      booleanItem: true,
      listOfStrings: ['', ''],
      moreProperties: { property: '', listOfStrings: ['', ''] },
      listOfObjects: [{ property: '' }, { property: '' }],
    });
  });
});
