import { CardElement, ChatRenderValidationLevelEnum } from '@novu/stateless';
import { describe, expect, test } from 'vitest';
import { toSlackFlavoredCard, validateSlackCard } from './card-render.utils';

const markdownCard = (content: string): CardElement => ({
  type: 'card',
  children: [{ type: 'text', content, style: 'plain' }],
});

const richContent = 'a **bold** _italic_ ~~strike~~ `code` [label](https://novu.co)';

describe('toSlackFlavoredCard', () => {
  test('translates the markdown subset into Slack mrkdwn', () => {
    const [text] = toSlackFlavoredCard(markdownCard(richContent)).children;

    expect(text).toEqual({
      type: 'text',
      content: 'a *bold* _italic_ ~strike~ `code` <https://novu.co|label>',
      style: 'plain',
    });
  });

  test('converts links and marks nested inside a link label', () => {
    const [text] = toSlackFlavoredCard(markdownCard('[**bold** link](https://novu.co)')).children;

    expect(text.type === 'text' && text.content).toBe('<https://novu.co|*bold* link>');
  });
});

describe('validateSlackCard', () => {
  test('returns no findings for a small card', () => {
    expect(validateSlackCard(markdownCard('hello'))).toEqual([]);
  });

  test('flags an over-limit block count as a blocking error (Slack rejects the payload)', () => {
    const card: CardElement = {
      type: 'card',
      children: Array.from({ length: 51 }, () => ({ type: 'divider' as const })),
    };

    const findings = validateSlackCard(card);
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      code: 'BLOCK_LIMIT_EXCEEDED',
      level: ChatRenderValidationLevelEnum.ERROR,
    });
  });

  test('flags an actions row over the Slack button limit', () => {
    const card: CardElement = {
      type: 'card',
      children: [
        {
          type: 'actions',
          children: Array.from({ length: 26 }, (_, index) => ({
            type: 'link-button' as const,
            label: `b${index}`,
            url: `https://novu.co/${index}`,
          })),
        },
      ],
    };

    expect(validateSlackCard(card).map((warning) => warning.code)).toContain('BUTTON_LIMIT_EXCEEDED');
  });
});
