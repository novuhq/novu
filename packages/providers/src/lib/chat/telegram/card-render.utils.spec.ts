import { CardElement, ChatRenderValidationLevelEnum } from '@novu/stateless';
import { describe, expect, test } from 'vitest';
import { cardToTelegramHtml, validateTelegramCard } from './card-render.utils';

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

describe('validateTelegramCard', () => {
  test('returns no findings for a small card', () => {
    expect(validateTelegramCard(markdownCard('hello'))).toEqual([]);
  });

  test('flags an over-long message as a non-blocking degradation warning (truncation)', () => {
    const findings = validateTelegramCard(markdownCard('a'.repeat(4097)));

    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      code: 'MESSAGE_LENGTH_EXCEEDED',
      level: ChatRenderValidationLevelEnum.WARNING,
    });
  });

  test('flags text that only exceeds 4096 once the whole card is flattened into one message', () => {
    const card: CardElement = {
      type: 'card',
      children: Array.from({ length: 3 }, () => ({
        type: 'text' as const,
        content: 'a'.repeat(2000),
        style: 'plain' as const,
      })),
    };

    const findings = validateTelegramCard(card);

    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      code: 'MESSAGE_LENGTH_EXCEEDED',
      level: ChatRenderValidationLevelEnum.WARNING,
    });
  });

  test('measures visible text, not the HTML markup — rich formatting under the cap does not warn', () => {
    expect(validateTelegramCard(markdownCard(richContent))).toEqual([]);
  });

  test('does not flag block count — Telegram flattens the card into one message', () => {
    const card: CardElement = {
      type: 'card',
      children: Array.from({ length: 60 }, () => ({ type: 'divider' as const })),
    };

    expect(validateTelegramCard(card)).toEqual([]);
  });
});
