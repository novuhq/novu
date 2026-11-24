import { CopilotViewingResourceEnum } from '@novu/shared';
import { describe, expect, it } from 'vitest';
import { buildRequestsViewing, buildWorkflowRunsViewing } from './activity-copilot';

describe('buildWorkflowRunsViewing', () => {
  it('returns nothing without an open run or a filter', () => {
    expect(buildWorkflowRunsViewing(new URLSearchParams('page=2'))).toBeUndefined();
  });

  it('labels the open run with its workflow name once loaded, its id prefix before', () => {
    expect(buildWorkflowRunsViewing(new URLSearchParams(), { id: '6650f1a2b3c4d5e6f7a8b9c0' })).toEqual({
      resource: {
        type: CopilotViewingResourceEnum.WORKFLOW_RUN,
        id: '6650f1a2b3c4d5e6f7a8b9c0',
        label: 'Run 6650f1a2',
      },
    });
    expect(
      buildWorkflowRunsViewing(new URLSearchParams(), { id: '6650f1a2b3c4d5e6f7a8b9c0', workflowName: 'Welcome' })
        ?.resource?.label
    ).toBe('Welcome');
  });

  it('keeps only the filters set in the URL, splitting comma lists', () => {
    const searchParams = new URLSearchParams(
      'activityItemId=run_1&page=3&channels=email,sms&workflows=welcome&transactionId=tx_1&transactionId=tx_2&subscriberId=&dateRange=7d&contextKeys=tenant:acme'
    );

    expect(buildWorkflowRunsViewing(searchParams)).toEqual({
      filters: {
        channels: ['email', 'sms'],
        workflows: 'welcome',
        transactionId: ['tx_1', 'tx_2'],
        dateRange: '7d',
        contextKeys: 'tenant:acme',
      },
    });
  });

  it('keeps an empty contextKeys, which filters for runs without a context', () => {
    expect(buildWorkflowRunsViewing(new URLSearchParams('contextKeys='))).toEqual({ filters: { contextKeys: '' } });
  });
});

describe('buildRequestsViewing', () => {
  it('labels the open request with its method and path once loaded, its id prefix before', () => {
    expect(buildRequestsViewing(new URLSearchParams(), { id: 'req_0123456789' })).toEqual({
      resource: { type: CopilotViewingResourceEnum.REQUEST, id: 'req_0123456789', label: 'Request req_0123' },
    });
    expect(
      buildRequestsViewing(new URLSearchParams(), { id: 'req_0123456789', method: 'POST', path: '/v1/events/trigger' })
        ?.resource?.label
    ).toBe('POST /v1/events/trigger');
  });

  it('keeps only the request filters set in the URL', () => {
    const searchParams = new URLSearchParams(
      'selectedLogId=req_1&status=400&status=500&urlPattern=/v1/events&limit=50'
    );

    expect(buildRequestsViewing(searchParams)).toEqual({
      filters: { status: ['400', '500'], urlPattern: '/v1/events' },
    });
  });
});
