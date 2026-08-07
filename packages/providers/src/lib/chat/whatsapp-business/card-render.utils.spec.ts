import { CardElement, ChatRenderValidationLevelEnum } from '@novu/stateless';
import { describe, expect, test } from 'vitest';
import { cardToWhatsAppText, validateWhatsAppCard } from './card-render.utils';

const markdownCard = (content: string): CardElement => ({
  type: 'card',
  children: [{ type: 'text', content, style: 'plain' }],
});

const richContent = 'a **bold** _italic_ ~~strike~~ `code` [label](https://novu.co)';

describe('cardToWhatsAppText', () => {
  test('uses single-marker bold/strike and renders links as "label (url)"', () => {
    expect(cardToWhatsAppText(markdownCard(richContent))).toBe(
      'a *bold* _italic_ ~strike~ ```code``` label (https://novu.co)'
    );
  });

  test('renders a link child as "label (url)"', () => {
    const card: CardElement = {
      type: 'card',
      children: [{ type: 'link', label: 'Docs', url: 'https://novu.co/docs' }],
    };

    expect(cardToWhatsAppText(card)).toBe('Docs (https://novu.co/docs)');
  });

  test('renders section, fields and interactive action labels', () => {
    const card: CardElement = {
      type: 'card',
      children: [
        {
          type: 'section',
          children: [
            { type: 'text', content: 'Details', style: 'plain' },
            {
              type: 'fields',
              children: [{ type: 'field', label: 'Env', value: 'prod' }],
            },
          ],
        },
        {
          type: 'actions',
          children: [
            { type: 'button', id: 'approve', label: 'Approve' },
            { type: 'link-button', label: 'Docs', url: 'https://novu.co' },
          ],
        },
      ],
    };

    expect(cardToWhatsAppText(card)).toBe(['Details\n\n*Env:* prod', 'Approve\nDocs (https://novu.co)'].join('\n\n'));
  });
});

describe('validateWhatsAppCard', () => {
  test('returns no findings for a small card', () => {
    expect(validateWhatsAppCard(markdownCard('hello'))).toEqual([]);
  });

  test('flags an over-long body as a non-blocking degradation warning', () => {
    const findings = validateWhatsAppCard(markdownCard('a'.repeat(1025)));

    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      code: 'MESSAGE_LENGTH_EXCEEDED',
      level: ChatRenderValidationLevelEnum.WARNING,
    });
  });

  test('flags text that only exceeds 1024 once the whole card is flattened into one body', () => {
    const card: CardElement = {
      type: 'card',
      children: Array.from({ length: 2 }, () => ({
        type: 'text' as const,
        content: 'a'.repeat(600),
        style: 'plain' as const,
      })),
    };

    const findings = validateWhatsAppCard(card);

    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      code: 'MESSAGE_LENGTH_EXCEEDED',
      level: ChatRenderValidationLevelEnum.WARNING,
    });
  });

  test('does not flag link buttons — WhatsApp degrades them to inline body text', () => {
    const card: CardElement = {
      type: 'card',
      children: [
        {
          type: 'actions',
          children: Array.from({ length: 6 }, (_, index) => ({
            type: 'link-button' as const,
            label: `b${index}`,
            url: `https://novu.co/${index}`,
          })),
        },
      ],
    };

    expect(validateWhatsAppCard(card)).toEqual([]);
  });
});
