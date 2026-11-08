import { CopilotReviewActionEnum } from '@novu/shared';
import { describe, expect, it } from 'vitest';
import { getCardButtonLabel } from './copilot-review-labels';

describe('getCardButtonLabel', () => {
  it.each([
    [CopilotReviewActionEnum.KEEP, 'Keep', 'Keep all'],
    [CopilotReviewActionEnum.REVERT, 'Revert', 'Discard'],
    [CopilotReviewActionEnum.TRY_AGAIN, 'Try again', 'Try again'],
  ])('shows the dashboard copy for the %s review button', (id, label, expected) => {
    expect(getCardButtonLabel({ id, label })).toBe(expected);
  });

  it("keeps the agent's label on any other button", () => {
    expect(getCardButtonLabel({ id: 'open-docs', label: 'Open docs' })).toBe('Open docs');
  });
});
