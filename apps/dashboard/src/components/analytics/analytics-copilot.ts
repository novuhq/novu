import type { CopilotViewing } from '@novu/shared';
import type { CopilotPageView } from '@/components/copilot-web-chat/copilot-page-view-store';

/** The agent keeps at most this many values of one filter, and drops the whole filter past it. */
const MAX_WORKFLOW_FILTER_VALUES = 10;

/**
 * What the Usage page registers with the Copilot: the period its charts show and the workflows they're filtered by,
 * as ids. Past the agent's limit no workflows are sent: the first ten would read as the page's filter and give
 * numbers the page doesn't show. Nothing is open on the page, so there is no resource and no question, and it has
 * no sheet.
 */
export function buildUsagePageView({
  period,
  workflowIds,
}: {
  period: string;
  workflowIds: readonly string[];
}): CopilotPageView {
  const filters: NonNullable<CopilotViewing['filters']> = { period };
  if (workflowIds.length > 0 && workflowIds.length <= MAX_WORKFLOW_FILTER_VALUES) {
    filters.workflows = workflowIds.length === 1 ? workflowIds[0] : [...workflowIds];
  }

  return { viewing: { filters } };
}
