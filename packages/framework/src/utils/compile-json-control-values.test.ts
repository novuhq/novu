import { describe, expect, it } from 'vitest';
import { compileJsonControlValues, parseLiquidControlValue } from './compile-json-control-values';
import { createLiquidEngine } from './liquid.utils';

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

describe('parseLiquidControlValue', () => {
  const engine = createLiquidEngine();

  it('accepts single quotes and tags that span lines', () => {
    expect(() => parseLiquidControlValue(engine, "{{ payload.name | append: '!' }}")).not.toThrow();
    expect(() => parseLiquidControlValue(engine, '{% if payload.a\n  and payload.b %}x{% endif %}')).not.toThrow();
  });

  it('rejects double quotes inside Liquid, which compile cannot render', async () => {
    const body = '{{ payload.name | append: "!" }}';

    expect(() => parseLiquidControlValue(engine, body)).toThrow();
    await expect(compileJsonControlValues({ body }, { payload: { name: 'A' } })).rejects.toThrow();
  });

  it('reads a JSON string control value at one level of escaping', () => {
    const maily = JSON.stringify({ type: 'doc', content: [{ type: 'text', text: "{{ payload.a | append: '!' }}" }] });

    expect(() => parseLiquidControlValue(engine, maily)).not.toThrow();
  });
});
