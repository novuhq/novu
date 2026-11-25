import { CopilotViewingResourceEnum } from '@novu/shared';
import { describe, expect, it } from 'vitest';
import {
  buildSubscriberPageView,
  buildSubscriberViewing,
  SUBSCRIBER_REACHABILITY_QUESTION,
} from './subscribers-copilot';

describe('buildSubscriberViewing', () => {
  it('labels the open subscriber with their id before the profile loads', () => {
    expect(buildSubscriberViewing('sub_8f21')).toEqual({
      resource: { type: CopilotViewingResourceEnum.SUBSCRIBER, id: 'sub_8f21', label: 'sub_8f21' },
    });
  });

  it('labels the open subscriber with their name once loaded', () => {
    expect(buildSubscriberViewing('sub_8f21', { firstName: ' Jane', lastName: 'Alvarez ' }).resource?.label).toBe(
      'Jane Alvarez'
    );
    expect(buildSubscriberViewing('sub_8f21', { firstName: 'Jane', lastName: null }).resource?.label).toBe('Jane');
  });

  it('falls back to the id when the subscriber has no name', () => {
    expect(buildSubscriberViewing('sub_8f21', { firstName: '', lastName: '  ' }).resource?.label).toBe('sub_8f21');
  });
});

describe('buildSubscriberPageView', () => {
  it('registers the subscriber by id, with the question, while the subscriber loads', () => {
    expect(buildSubscriberPageView('sub_8f21', { isError: false })).toEqual({
      viewing: { resource: { type: CopilotViewingResourceEnum.SUBSCRIBER, id: 'sub_8f21', label: 'sub_8f21' } },
      question: SUBSCRIBER_REACHABILITY_QUESTION,
      overSheet: true,
    });
  });

  it('labels the loaded subscriber with their name', () => {
    const view = buildSubscriberPageView('sub_8f21', {
      subscriber: { firstName: 'Jane', lastName: 'Alvarez' },
      isError: false,
    });

    expect(view.viewing?.resource?.label).toBe('Jane Alvarez');
    expect(view.question).toBe(SUBSCRIBER_REACHABILITY_QUESTION);
    expect(view.overSheet).toBe(true);
  });

  // A deleted subscriber or a mistyped id: there is nothing open to ask about, but the drawer still covers the page.
  it('registers no subscriber and no question when the fetch failed before any subscriber loaded', () => {
    expect(buildSubscriberPageView('sub_8f21', { isError: true })).toEqual({ overSheet: true });
  });

  // TanStack Query keeps the last data when a background refetch fails, and the drawer still shows the subscriber.
  it('keeps the loaded subscriber and the question when a refetch fails', () => {
    expect(buildSubscriberPageView('sub_8f21', { subscriber: { firstName: 'Jane' }, isError: true })).toEqual({
      viewing: { resource: { type: CopilotViewingResourceEnum.SUBSCRIBER, id: 'sub_8f21', label: 'Jane' } },
      question: SUBSCRIBER_REACHABILITY_QUESTION,
      overSheet: true,
    });
  });
});
