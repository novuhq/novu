import { describe, expect, it } from 'vitest';
import {
  HumanInteractionKindEnum,
  humanInteractionApproveExtraActions,
  humanInteractionChooseOptions,
  isHumanCardElement,
  isHumanCardElementContent,
  isHumanChromeContent,
  resolveHumanInteractionCard,
} from './human-interaction';

describe('resolveHumanInteractionCard', () => {
  it('reads chrome from content.cardChrome', () => {
    const card = resolveHumanInteractionCard({
      kind: HumanInteractionKindEnum.APPROVE,
      content: {
        cardChrome: {
          title: 'Card title',
          subtitle: 'issue_refund',
          extraActions: [{ id: 'trust-tool', label: 'Always' }],
        },
      },
    });

    expect(card.title).toBe('Card title');
    expect(card).toMatchObject({
      subtitle: 'issue_refund',
      extraActions: [{ id: 'trust-tool', label: 'Always' }],
    });
  });

  it('treats a posted Card element as content.card', () => {
    const posted = { type: 'card' as const, title: 'Refund $25?', children: [] };
    expect(isHumanCardElement(posted)).toBe(true);
    expect(isHumanCardElement({ title: 'Refund $25?' })).toBe(false);
    expect(isHumanCardElementContent({ card: posted })).toBe(true);
    expect(isHumanChromeContent({ cardChrome: { title: 'Refund $25?' } })).toBe(true);
    expect(
      humanInteractionChooseOptions({
        kind: HumanInteractionKindEnum.CHOOSE,
        content: { card: posted },
      })
    ).toEqual([]);
    expect(
      humanInteractionApproveExtraActions({
        kind: HumanInteractionKindEnum.APPROVE,
        content: { card: posted },
      })
    ).toEqual([]);
  });

  it('reads approve extras from content.cardChrome', () => {
    expect(
      humanInteractionApproveExtraActions({
        kind: HumanInteractionKindEnum.APPROVE,
        content: {
          cardChrome: { title: 'Deploy?', extraActions: [{ id: 'trust-tool', label: 'Always allow this tool' }] },
        },
      })
    ).toEqual([{ id: 'trust-tool', label: 'Always allow this tool' }]);
  });
});
