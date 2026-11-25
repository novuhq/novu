import { AiWorkflowSuggestion, StepTypeEnum } from '@novu/shared';
import { RiListCheck3, RiQuillPenLine } from 'react-icons/ri';
import type { CopilotSuggestion } from '@/components/copilot-web-chat';
import { Code2 } from '@/components/icons/code-2';

const CONTENT_STEP_TYPES: StepTypeEnum[] = [
  StepTypeEnum.EMAIL,
  StepTypeEnum.SMS,
  StepTypeEnum.PUSH,
  StepTypeEnum.IN_APP,
  StepTypeEnum.CHAT,
  StepTypeEnum.TOOL,
];

/** Steps with message content the Copilot can write or improve. */
export function isContentStepType(type: StepTypeEnum): boolean {
  return CONTENT_STEP_TYPES.includes(type);
}

/**
 * A new chat's suggestions on the workflow canvas. Built from the facts that decide them, so callers memoize on those
 * values: a list rebuilt on every refetch would re-register the Copilot page context each time.
 */
export function getWorkflowNewChatSuggestions({
  hasSteps,
  hasContentSteps,
  hasIssues,
}: {
  hasSteps: boolean;
  hasContentSteps: boolean;
  hasIssues: boolean;
}): Required<CopilotSuggestion>[] {
  const suggestions: Required<CopilotSuggestion>[] = [{ label: AiWorkflowSuggestion.AUTOCOMPLETE, icon: RiListCheck3 }];

  if (hasSteps) suggestions.push({ label: AiWorkflowSuggestion.APPLY_CONDITIONS, icon: Code2 });
  if (hasContentSteps) suggestions.push({ label: AiWorkflowSuggestion.IMPROVE_MESSAGING, icon: RiQuillPenLine });
  if (hasIssues) suggestions.push({ label: AiWorkflowSuggestion.FIX_WORKFLOW_ISSUES, icon: RiListCheck3 });

  return suggestions;
}

/** A new chat's suggestions in the step editor; memoize on the same kind of facts as the canvas. */
export function getStepNewChatSuggestions({
  isContentStep,
  hasBody,
  hasIssues,
}: {
  isContentStep: boolean;
  hasBody: boolean;
  hasIssues: boolean;
}): Required<CopilotSuggestion>[] {
  const suggestions: Required<CopilotSuggestion>[] = [
    { label: AiWorkflowSuggestion.AUTOCOMPLETE, icon: RiListCheck3 },
    { label: AiWorkflowSuggestion.APPLY_CONDITIONS, icon: Code2 },
  ];

  if (isContentStep) {
    suggestions.push({
      label: hasBody ? AiWorkflowSuggestion.IMPROVE_MESSAGING : AiWorkflowSuggestion.GENERATE_STEP_CONTENT,
      icon: RiQuillPenLine,
    });
  }
  if (hasIssues) suggestions.push({ label: AiWorkflowSuggestion.FIX_STEP_ISSUES, icon: RiListCheck3 });

  return suggestions;
}
