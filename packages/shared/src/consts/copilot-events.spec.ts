import { describe, expect, it } from 'vitest';

import {
  buildCopilotFixActionId,
  COPILOT_ASK_ACTION_ID,
  CopilotReviewActionEnum,
  isCopilotPromptActionId,
  parseCopilotFixActionId,
} from './copilot-events';

describe('Copilot fix action ids', () => {
  it('names the step of an issue on a step, and none for the workflow itself', () => {
    expect(parseCopilotFixActionId(buildCopilotFixActionId('email-step'))).toEqual({ stepId: 'email-step' });
    expect(parseCopilotFixActionId(buildCopilotFixActionId())).toEqual({});
  });

  it('keeps a stepId that holds a colon', () => {
    expect(parseCopilotFixActionId(buildCopilotFixActionId('a:b'))).toEqual({ stepId: 'a:b' });
  });

  it('reads no issue from any other id', () => {
    expect(parseCopilotFixActionId(COPILOT_ASK_ACTION_ID)).toBeUndefined();
    expect(parseCopilotFixActionId('copilot.fixed')).toBeUndefined();
    expect(parseCopilotFixActionId(CopilotReviewActionEnum.KEEP)).toBeUndefined();
  });
});

describe('isCopilotPromptActionId', () => {
  it('is true for asks and fixes only', () => {
    expect(isCopilotPromptActionId(COPILOT_ASK_ACTION_ID)).toBe(true);
    expect(isCopilotPromptActionId(buildCopilotFixActionId('email-step'))).toBe(true);
    expect(isCopilotPromptActionId(buildCopilotFixActionId())).toBe(true);
    expect(isCopilotPromptActionId(CopilotReviewActionEnum.REVERT)).toBe(false);
    expect(isCopilotPromptActionId('submit')).toBe(false);
  });
});
