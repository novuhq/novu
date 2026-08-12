import { describe, expect, it } from 'vitest';
import { plainTextToMailyJson } from './maily-utils';

const variableNode = (id: string) => ({
  type: 'variable',
  attrs: {
    id,
    label: null,
    fallback: null,
    required: false,
    aliasFor: null,
  },
});

describe('plainTextToMailyJson', () => {
  it('converts legacy liquid variables into maily variable nodes', () => {
    const result = JSON.parse(plainTextToMailyJson('hello from the old chat! {{payload.foo}}'));

    expect(result).toEqual({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'hello from the old chat! ' }, variableNode('payload.foo')],
        },
      ],
    });
  });

  it('preserves filters on the variable id', () => {
    const result = JSON.parse(
      plainTextToMailyJson(
        "Hi {{ subscriber.firstName }}, order {{payload.id | upcase}} status {{payload.status | default: 'pending' | upcase}} {{payload.foo | truncate: 10}}"
      )
    );

    expect(result.content[0].content).toEqual([
      { type: 'text', text: 'Hi ' },
      variableNode('subscriber.firstName'),
      { type: 'text', text: ', order ' },
      variableNode('payload.id | upcase'),
      { type: 'text', text: ' status ' },
      variableNode("payload.status | default: 'pending' | upcase"),
      { type: 'text', text: ' ' },
      variableNode('payload.foo | truncate: 10'),
    ]);
  });

  it('leaves translation variables as text for the translation decorator', () => {
    const result = JSON.parse(plainTextToMailyJson('Say {{t.greeting}} please'));

    expect(result.content[0].content).toEqual([{ type: 'text', text: 'Say {{t.greeting}} please' }]);
  });

  it('converts regular variables while keeping translation markers as text', () => {
    const result = JSON.parse(plainTextToMailyJson('{{t.hello}} {{payload.name | capitalize}} and {{ T.farewell }}'));

    expect(result.content[0].content).toEqual([
      { type: 'text', text: '{{t.hello}} ' },
      variableNode('payload.name | capitalize'),
      { type: 'text', text: ' and {{ T.farewell }}' },
    ]);
  });

  it('keeps plain text lines without variables unchanged', () => {
    const result = JSON.parse(plainTextToMailyJson('just text\n\nsecond line'));

    expect(result.content).toEqual([
      {
        type: 'paragraph',
        content: [{ type: 'text', text: 'just text' }],
      },
      { type: 'paragraph', content: [] },
      {
        type: 'paragraph',
        content: [{ type: 'text', text: 'second line' }],
      },
    ]);
  });

  it('handles variables that occupy the whole line', () => {
    const result = JSON.parse(plainTextToMailyJson('{{payload.only}}'));

    expect(result.content[0].content).toEqual([variableNode('payload.only')]);
  });
});
