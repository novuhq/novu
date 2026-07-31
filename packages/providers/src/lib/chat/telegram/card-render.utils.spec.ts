import { CardElement } from '@novu/stateless';
import { describe, expect, test } from 'vitest';
import { cardToTelegramHtml } from './card-render.utils';

const markdownCard = (content: string): CardElement => ({
  type: 'card',
  children: [{ type: 'text', content, style: 'plain' }],
});

const richContent = 'a **bold** _italic_ ~~strike~~ `code` [label](https://novu.co)';

describe('cardToTelegramHtml', () => {
  test('renders HTML tags for the markdown subset', () => {
    expect(cardToTelegramHtml(markdownCard(richContent))).toBe(
      'a <b>bold</b> <i>italic</i> <s>strike</s> <code>code</code> <a href="https://novu.co">label</a>'
    );
  });

  test('escapes HTML control characters in plain text', () => {
    expect(cardToTelegramHtml(markdownCard('1 < 2 & 3 > 0'))).toBe('1 &lt; 2 &amp; 3 &gt; 0');
  });
});
