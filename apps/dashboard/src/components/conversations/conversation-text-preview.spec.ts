import { describe, expect, it } from 'vitest';
import { toPlainTextPreview } from './conversation-text-preview';

describe('toPlainTextPreview', () => {
  it('collapses line breaks and repeated whitespace into single spaces', () => {
    expect(toPlainTextPreview('  Hi team,\n\nOur deploy\tfailed   again \n')).toBe('Hi team, Our deploy failed again');
  });

  it('drops code fences but keeps the code text', () => {
    const markdown = ['Here is the error:', '', '```ts', 'Error: connect ECONNREFUSED', '```', 'Any idea?'].join('\n');

    expect(toPlainTextPreview(markdown)).toBe('Here is the error: Error: connect ECONNREFUSED Any idea?');
  });

  it('drops an unclosed fence left by a truncated title', () => {
    expect(toPlainTextPreview('The error:\n\n```\nError: connect ECONNRE')).toBe('The error: Error: connect ECONNRE');
  });

  it('strips heading, blockquote and bullet markers while keeping ordered list numbers', () => {
    const markdown = ['## Expected', '> quoted', '- first', '* second', '1. Run the dev server'].join('\n');

    expect(toPlainTextPreview(markdown)).toBe('Expected quoted first second 1. Run the dev server');
  });

  it('keeps the visible text of links, images, emphasis and inline code', () => {
    const markdown =
      'See **the docs** at [Novu](https://novu.co) ![logo](https://novu.co/logo.png), run `npx novu dev` ~~now~~';

    expect(toPlainTextPreview(markdown)).toBe('See the docs at Novu logo, run npx novu dev now');
  });

  it('leaves identifiers, arithmetic and hashtags untouched', () => {
    expect(toPlainTextPreview('Trigger order_shipped from __init__ when 5 * 3 > 10 #urgent')).toBe(
      'Trigger order_shipped from __init__ when 5 * 3 > 10 #urgent'
    );
  });

  it('keeps right-to-left text and long unbroken tokens intact', () => {
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9'.repeat(10);

    expect(toPlainTextPreview(`שלום, ההודעה ${token}`)).toBe(`שלום, ההודעה ${token}`);
  });

  it('returns an empty string for whitespace-only input', () => {
    expect(toPlainTextPreview(' \n\t ')).toBe('');
  });
});
