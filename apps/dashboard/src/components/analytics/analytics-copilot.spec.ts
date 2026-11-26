import { serializeCopilotViewing } from '@novu/shared';
import { describe, expect, it } from 'vitest';
import { buildUsagePageView } from './analytics-copilot';
import {
  isWorkflowFilterCarriedOver,
  readAnalyticsUrlFilters,
  withAnalyticsUrlFilters,
  workflowFilterOptions,
} from './utils/analytics-url-filters';

const WORKFLOW_ID = '64b7f0c2a1b2c3d4e5f60718';

describe('buildUsagePageView', () => {
  it('sends the period the charts show, with no resource, question or sheet', () => {
    expect(buildUsagePageView({ period: '7d', workflowIds: [] })).toEqual({ viewing: { filters: { period: '7d' } } });
  });

  it('sends one workflow as its id, and several as a list', () => {
    expect(buildUsagePageView({ period: '30d', workflowIds: [WORKFLOW_ID] })).toEqual({
      viewing: { filters: { period: '30d', workflows: WORKFLOW_ID } },
    });
    expect(buildUsagePageView({ period: '30d', workflowIds: ['a'.repeat(24), 'b'.repeat(24)] })).toEqual({
      viewing: { filters: { period: '30d', workflows: ['a'.repeat(24), 'b'.repeat(24)] } },
    });
  });

  it('sends as many workflows as the agent accepts, within the metadata limit, and none past it', () => {
    const workflowIds = (length: number) => Array.from({ length }, (_, index) => String(index).padStart(24, '0'));

    const { viewing } = buildUsagePageView({ period: '90d', workflowIds: workflowIds(10) });

    expect(viewing?.filters?.workflows).toEqual(workflowIds(10));
    expect(JSON.parse(serializeCopilotViewing(viewing) ?? '{}')).toEqual(viewing);
    // The first ten of eleven would read as the page's filter, and give numbers the page doesn't show.
    expect(buildUsagePageView({ period: '90d', workflowIds: workflowIds(11) })).toEqual({
      viewing: { filters: { period: '90d' } },
    });
  });
});

describe('the Usage page URL filters', () => {
  it('reads the period and the comma-separated workflow ids, lowercased, without blanks, repeats or values that are no _id', () => {
    expect(
      readAnalyticsUrlFilters(
        new URLSearchParams(
          `period=7d&workflows=${WORKFLOW_ID},,${WORKFLOW_ID.toUpperCase()}, ${'C'.repeat(24)} ,b,${'x'.repeat(500)}`
        )
      )
    ).toEqual({ period: '7d', workflowIds: [WORKFLOW_ID, 'c'.repeat(24)] });
    expect(readAnalyticsUrlFilters(new URLSearchParams(''))).toEqual({ period: undefined, workflowIds: [] });
  });

  it('writes the filters the usage tool links to, keeping other params', () => {
    const next = withAnalyticsUrlFilters(new URLSearchParams('dev_mock_date=true&period=30d'), {
      period: '7d',
      workflowIds: [WORKFLOW_ID],
    });

    expect(next.toString()).toBe(`dev_mock_date=true&period=7d&workflows=${WORKFLOW_ID}`);
  });

  it('lists a linked workflow the page did not load, by its id, so the filter shows it', () => {
    const workflows = [{ _id: WORKFLOW_ID, name: 'Password reset' }];

    expect(workflowFilterOptions(workflows, [WORKFLOW_ID, 'c'.repeat(24)])).toEqual([
      { label: 'Password reset', value: WORKFLOW_ID },
      { label: 'c'.repeat(24), value: 'c'.repeat(24) },
    ]);
    expect(workflowFilterOptions(undefined, [WORKFLOW_ID])).toEqual([]);
  });

  it("drops the workflows an environment switch carries over, and keeps a link's to another environment", () => {
    const development = { environmentSlug: 'development', workflowIds: [WORKFLOW_ID] };

    // The switch keeps the query string: the same ids arrive under the other environment.
    expect(isWorkflowFilterCarriedOver(development, { ...development, environmentSlug: 'production' })).toBe(true);
    // A link to another environment's Usage page brings that environment's ids.
    expect(
      isWorkflowFilterCarriedOver(development, { environmentSlug: 'production', workflowIds: ['c'.repeat(24)] })
    ).toBe(false);
    expect(isWorkflowFilterCarriedOver(development, { environmentSlug: 'production', workflowIds: [] })).toBe(false);
    expect(isWorkflowFilterCarriedOver(development, { ...development, workflowIds: ['c'.repeat(24)] })).toBe(false);
    expect(isWorkflowFilterCarriedOver({ ...development, environmentSlug: undefined }, development)).toBe(false);
  });

  it('drops the workflows param once no workflow is picked', () => {
    const next = withAnalyticsUrlFilters(new URLSearchParams(`period=7d&workflows=${WORKFLOW_ID}`), {
      period: '7d',
      workflowIds: [],
    });

    expect(next.toString()).toBe('period=7d');
  });
});
