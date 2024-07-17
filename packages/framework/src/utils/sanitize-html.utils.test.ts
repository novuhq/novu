import { it, describe, expect } from 'vitest';
import { sanitizeHtmlInObject } from './sanitize-html.utils';

const scriptBody = `<script>alert('Hello there')</script>`;

describe('sanitize html in object', () => {
  it('sanitize html', () => {
    const myTestObject = {
      property: scriptBody,
      numberItem: 0,
      listOfStrings: [scriptBody, scriptBody],
      moreProperties: {
        property: scriptBody,
        listOfStrings: [scriptBody, scriptBody],
      },
    };

    const result = sanitizeHtmlInObject(myTestObject);

    expect(result).toStrictEqual({
      property: '',
      numberItem: 0,
      listOfStrings: ['', ''],
      moreProperties: { property: '', listOfStrings: ['', ''] },
    });
  });
});
