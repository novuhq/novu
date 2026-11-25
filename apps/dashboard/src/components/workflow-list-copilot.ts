import type { CopilotViewing } from '@novu/shared';

/** The workflows list's filter params, as `pages/workflows.tsx` writes them: `query` once, `tags` and `status` repeated. */
const FILTER_PARAMS = ['query', 'status', 'tags'] as const;

/**
 * What the workflows list shows: its filters, as the URL holds them, so "these workflows" reads the same list. Nothing
 * opens on the list itself; a workflow opens in the editor, which has its own Copilot.
 */
export function buildWorkflowListViewing(searchParams: URLSearchParams): CopilotViewing | undefined {
  const filters: NonNullable<CopilotViewing['filters']> = {};

  for (const param of FILTER_PARAMS) {
    const values = searchParams
      .getAll(param)
      .map((value) => value.trim())
      .filter(Boolean);

    if (values.length > 0) {
      filters[param] = values.length === 1 ? values[0] : values;
    }
  }

  return Object.keys(filters).length > 0 ? { filters } : undefined;
}
