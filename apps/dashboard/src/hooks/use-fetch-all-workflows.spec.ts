import { describe, expect, it } from 'vitest';
import { getNextWorkflowOffset } from './use-fetch-all-workflows';

function buildPage(workflowCount: number, totalCount: number) {
  return {
    workflows: Array.from({ length: workflowCount }),
    totalCount,
  };
}

describe('getNextWorkflowOffset', () => {
  it('continues loading until every workflow page is fetched', () => {
    const firstPage = buildPage(100, 250);
    const secondPage = buildPage(100, 250);
    const finalPage = buildPage(50, 250);

    expect(getNextWorkflowOffset(firstPage, [firstPage])).toBe(100);
    expect(getNextWorkflowOffset(secondPage, [firstPage, secondPage])).toBe(200);
    expect(getNextWorkflowOffset(finalPage, [firstPage, secondPage, finalPage])).toBeUndefined();
  });

  it('stops when the API returns an empty page', () => {
    const firstPage = buildPage(100, 250);
    const emptyPage = buildPage(0, 250);

    expect(getNextWorkflowOffset(emptyPage, [firstPage, emptyPage])).toBeUndefined();
  });
});
