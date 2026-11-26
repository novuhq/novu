/**
 * The Usage page keeps its period and workflow filter in the URL (`?period=7d&workflows=<id>,<id>`), so a shared link,
 * or one the Copilot's usage tool returns, opens the page on what it measured. Workflows are database _ids, as on the
 * Activity page.
 */

const PERIOD_PARAM = 'period';
const WORKFLOWS_PARAM = 'workflows';
const OBJECT_ID = /^[a-f\d]{24}$/;

export type AnalyticsUrlFilters = {
  period?: string;
  workflowIds: string[];
};

/** The URL's filters. A value that isn't a workflow _id is dropped, so it can't filter every chart to zero. */
export function readAnalyticsUrlFilters(searchParams: URLSearchParams): AnalyticsUrlFilters {
  const period = searchParams.get(PERIOD_PARAM)?.trim() || undefined;
  const workflowIds = searchParams
    .getAll(WORKFLOWS_PARAM)
    .flatMap((value) => value.split(','))
    .map((value) => value.trim().toLowerCase())
    .filter((value) => OBJECT_ID.test(value));

  return { period, workflowIds: [...new Set(workflowIds)] };
}

/**
 * The workflow filter's options. The page lists the first 100 workflows, so a linked workflow past them, or a deleted
 * one, gets an option labelled by its id once the list has loaded: the filter then shows it and can clear it.
 */
export function workflowFilterOptions(
  workflows: ReadonlyArray<{ _id: string; name: string }> | undefined,
  selectedIds: readonly string[]
): Array<{ label: string; value: string }> {
  if (!workflows) return [];

  const options = workflows.map((workflow) => ({ label: workflow.name, value: workflow._id }));
  const listed = new Set(options.map((option) => option.value));

  return [...options, ...selectedIds.filter((id) => !listed.has(id)).map((id) => ({ label: id, value: id }))];
}

/** The environment the page shows and the workflow filter its URL holds. */
export type WorkflowFilterOrigin = { environmentSlug: string | undefined; workflowIds: readonly string[] };

/**
 * Whether an environment switch carried the workflow filter over from another environment, whose _ids mean nothing
 * here. The switch keeps the query string, so the ids arrive unchanged; a link to another environment brings its own.
 */
export function isWorkflowFilterCarriedOver(previous: WorkflowFilterOrigin, next: WorkflowFilterOrigin): boolean {
  return (
    previous.environmentSlug !== undefined &&
    next.environmentSlug !== undefined &&
    previous.environmentSlug !== next.environmentSlug &&
    next.workflowIds.length > 0 &&
    next.workflowIds.join(',') === previous.workflowIds.join(',')
  );
}

/** `searchParams` with these filters; other params, such as `dev_mock_date`, are kept. */
export function withAnalyticsUrlFilters(
  searchParams: URLSearchParams,
  { period, workflowIds }: AnalyticsUrlFilters
): URLSearchParams {
  const next = new URLSearchParams(searchParams);
  next.delete(PERIOD_PARAM);
  next.delete(WORKFLOWS_PARAM);
  if (period) next.set(PERIOD_PARAM, period);
  if (workflowIds.length > 0) next.set(WORKFLOWS_PARAM, workflowIds.join(','));

  return next;
}
