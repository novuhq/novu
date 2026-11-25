import { describe, expect, it } from 'vitest';
import { buildWorkflowListViewing } from './workflow-list-copilot';

describe('buildWorkflowListViewing', () => {
  it('returns nothing without a filter', () => {
    expect(buildWorkflowListViewing(new URLSearchParams('offset=20&limit=10&orderBy=updatedAt'))).toBeUndefined();
    expect(buildWorkflowListViewing(new URLSearchParams('query='))).toBeUndefined();
  });

  it('keeps the search, status and tag filters set in the URL', () => {
    const searchParams = new URLSearchParams('query=order&status=ACTIVE&status=ERROR&tags=billing&offset=10');

    expect(buildWorkflowListViewing(searchParams)).toEqual({
      filters: { query: 'order', status: ['ACTIVE', 'ERROR'], tags: 'billing' },
    });
  });
});
