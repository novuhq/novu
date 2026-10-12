import { describe, expect, it } from 'vitest';
import { compileJsonControlValues } from './compile-json-control-values';

describe('compileJsonControlValues', () => {
  it('round-trips whitespace and a literal backslash-n', async () => {
    const values = { body: 'a\nb', tab: 'a\tb', literal: 'a\\nb' };

    expect(await compileJsonControlValues(values, {})).toEqual(values);
  });

  it('trims newlines around dash tags and keeps them for plain tags', async () => {
    const context = { subscriber: { firstName: 'Alex' } };

    const dash = await compileJsonControlValues(
      { body: '{%- assign x = subscriber.firstName -%}\nHi {{ subscriber.firstName }}' },
      context
    );
    const plain = await compileJsonControlValues(
      { body: '{% assign x = subscriber.firstName %}\nHi {{ subscriber.firstName }}' },
      context
    );
    const trimmedBranch = await compileJsonControlValues(
      { body: 'Hello\n{%- if true -%}\n{{ subscriber.firstName }}{%- endif -%}' },
      context
    );
    const plainBranch = await compileJsonControlValues(
      { body: 'Hello\n{% if true %}\n{{ subscriber.firstName }}{% endif %}' },
      context
    );

    expect(dash.body).toBe('Hi Alex');
    expect(plain.body).toBe('\nHi Alex');
    expect(trimmedBranch.body).toBe('HelloAlex');
    expect(plainBranch.body).toBe('Hello\n\nAlex');
  });

  it('keeps newlines that come from variable values', async () => {
    const result = await compileJsonControlValues(
      { body: 'Hi {{ subscriber.firstName }}' },
      { subscriber: { firstName: 'Alice\nBob' } }
    );

    expect(result.body).toBe('Hi Alice\nBob');
  });
});
