import { CopilotViewingResourceEnum } from '@novu/shared';
import { describe, expect, it } from 'vitest';
import { buildSubscriberViewing } from './subscribers-copilot';

describe('buildSubscriberViewing', () => {
  it('labels the open subscriber with their id before the profile loads', () => {
    expect(buildSubscriberViewing('sub_8f21')).toEqual({
      resource: { type: CopilotViewingResourceEnum.SUBSCRIBER, id: 'sub_8f21', label: 'sub_8f21' },
    });
  });

  it('labels the open subscriber with their name once loaded', () => {
    expect(buildSubscriberViewing('sub_8f21', { firstName: ' Jane ', lastName: 'Alvarez' }).resource?.label).toBe(
      'Jane Alvarez'
    );
    expect(buildSubscriberViewing('sub_8f21', { firstName: 'Jane', lastName: null }).resource?.label).toBe('Jane');
  });

  it('falls back to the id when the subscriber has no name', () => {
    expect(buildSubscriberViewing('sub_8f21', { firstName: '', lastName: '  ' }).resource?.label).toBe('sub_8f21');
  });
});
