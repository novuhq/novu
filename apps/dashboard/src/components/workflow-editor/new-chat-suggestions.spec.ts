import { AiWorkflowSuggestion, StepTypeEnum } from '@novu/shared';
import { describe, expect, it } from 'vitest';
import { getStepNewChatSuggestions, getWorkflowNewChatSuggestions, isContentStepType } from './new-chat-suggestions';

function labels(suggestions: { label: string }[]) {
  return suggestions.map(({ label }) => label);
}

describe('isContentStepType', () => {
  it('counts message steps and leaves out flow steps', () => {
    expect(isContentStepType(StepTypeEnum.EMAIL)).toBe(true);
    expect(isContentStepType(StepTypeEnum.TOOL)).toBe(true);
    expect(isContentStepType(StepTypeEnum.DELAY)).toBe(false);
    expect(isContentStepType(StepTypeEnum.DIGEST)).toBe(false);
  });
});

describe('getWorkflowNewChatSuggestions', () => {
  it('offers only autocomplete for an empty workflow', () => {
    expect(
      labels(getWorkflowNewChatSuggestions({ hasSteps: false, hasContentSteps: false, hasIssues: false }))
    ).toEqual([AiWorkflowSuggestion.AUTOCOMPLETE]);
  });

  it('adds conditions, messaging and fixes as the workflow has steps, content and issues', () => {
    expect(labels(getWorkflowNewChatSuggestions({ hasSteps: true, hasContentSteps: true, hasIssues: true }))).toEqual([
      AiWorkflowSuggestion.AUTOCOMPLETE,
      AiWorkflowSuggestion.APPLY_CONDITIONS,
      AiWorkflowSuggestion.IMPROVE_MESSAGING,
      AiWorkflowSuggestion.FIX_WORKFLOW_ISSUES,
    ]);
  });

  it('returns a new list for the same facts, so callers must memoize on the facts', () => {
    const facts = { hasSteps: true, hasContentSteps: false, hasIssues: false };

    expect(getWorkflowNewChatSuggestions(facts)).not.toBe(getWorkflowNewChatSuggestions(facts));
  });
});

describe('getStepNewChatSuggestions', () => {
  it('offers to write an empty content step and to improve a written one', () => {
    expect(labels(getStepNewChatSuggestions({ isContentStep: true, hasBody: false, hasIssues: false }))).toEqual([
      AiWorkflowSuggestion.AUTOCOMPLETE,
      AiWorkflowSuggestion.APPLY_CONDITIONS,
      AiWorkflowSuggestion.GENERATE_STEP_CONTENT,
    ]);
    expect(labels(getStepNewChatSuggestions({ isContentStep: true, hasBody: true, hasIssues: false }))).toEqual([
      AiWorkflowSuggestion.AUTOCOMPLETE,
      AiWorkflowSuggestion.APPLY_CONDITIONS,
      AiWorkflowSuggestion.IMPROVE_MESSAGING,
    ]);
  });

  it('skips content suggestions on a flow step and offers to fix step issues', () => {
    expect(labels(getStepNewChatSuggestions({ isContentStep: false, hasBody: false, hasIssues: true }))).toEqual([
      AiWorkflowSuggestion.AUTOCOMPLETE,
      AiWorkflowSuggestion.APPLY_CONDITIONS,
      AiWorkflowSuggestion.FIX_STEP_ISSUES,
    ]);
  });
});
