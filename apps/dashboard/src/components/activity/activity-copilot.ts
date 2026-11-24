import { type CopilotViewing, CopilotViewingResourceEnum } from '@novu/shared';

type ViewingFilters = NonNullable<CopilotViewing['filters']>;

/**
 * How a tab keeps a filter in its URL: one value per param, a comma-separated list, or contexts, where an empty value
 * is a filter of its own (runs without a context).
 */
type FilterParamFormat = 'value' | 'list' | 'contexts';

/** The workflow-runs tab's filter params, as `use-activity-url-state.ts` writes them. */
const WORKFLOW_RUNS_FILTER_PARAMS: Record<string, FilterParamFormat> = {
  channels: 'list',
  workflows: 'list',
  transactionId: 'value',
  subscriberId: 'value',
  topicKey: 'value',
  subscriptionId: 'value',
  dateRange: 'value',
  after: 'value',
  before: 'value',
  severity: 'list',
  contextKeys: 'contexts',
};

/** The requests tab's filter params, as `use-logs-url-state.ts` writes them. */
const REQUESTS_FILTER_PARAMS: Record<string, FilterParamFormat> = {
  status: 'value',
  transactionId: 'value',
  urlPattern: 'value',
  createdGte: 'value',
  source: 'value',
};

/**
 * The tab's filters as its URL holds them: the URL only keeps the ones the user set, so defaults stay out. One value
 * is sent as a string, several as an array.
 */
function readViewingFilters(
  searchParams: URLSearchParams,
  params: Record<string, FilterParamFormat>
): ViewingFilters | undefined {
  const filters: ViewingFilters = {};

  for (const [param, format] of Object.entries(params)) {
    const values = searchParams
      .getAll(param)
      .flatMap((value) => (format === 'list' ? value.split(',') : [value]))
      .map((value) => value.trim())
      .filter(Boolean);

    if (values.length > 0) {
      filters[param] = values.length === 1 ? values[0] : values;
    } else if (format === 'contexts' && searchParams.has(param)) {
      filters[param] = '';
    }
  }

  return Object.keys(filters).length > 0 ? filters : undefined;
}

function toViewing(
  resource: CopilotViewing['resource'],
  filters: ViewingFilters | undefined
): CopilotViewing | undefined {
  if (!resource && !filters) return undefined;

  const viewing: CopilotViewing = {};
  if (resource) viewing.resource = resource;
  if (filters) viewing.filters = filters;

  return viewing;
}

/** What the workflow-runs tab shows: the run open in its side panel and the active filters. */
export function buildWorkflowRunsViewing(
  searchParams: URLSearchParams,
  run?: { id: string; workflowName?: string }
): CopilotViewing | undefined {
  const resource = run && {
    type: CopilotViewingResourceEnum.WORKFLOW_RUN,
    id: run.id,
    label: run.workflowName || `Run ${run.id.slice(0, 8)}`,
  };

  return toViewing(resource, readViewingFilters(searchParams, WORKFLOW_RUNS_FILTER_PARAMS));
}

/** What the requests tab shows: the request open in its side panel and the active filters. */
export function buildRequestsViewing(
  searchParams: URLSearchParams,
  request?: { id: string; method?: string; path?: string }
): CopilotViewing | undefined {
  const resource = request && {
    type: CopilotViewingResourceEnum.REQUEST,
    id: request.id,
    label: request.method && request.path ? `${request.method} ${request.path}` : `Request ${request.id.slice(0, 8)}`,
  };

  return toViewing(resource, readViewingFilters(searchParams, REQUESTS_FILTER_PARAMS));
}
