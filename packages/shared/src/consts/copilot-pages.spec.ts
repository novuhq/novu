import { describe, expect, it } from 'vitest';

import {
  CopilotPageEnum,
  CopilotViewingResourceEnum,
  parseCopilotPages,
  serializeCopilotViewing,
} from './copilot-pages';

describe('serializeCopilotViewing', () => {
  const resource = { type: CopilotViewingResourceEnum.WORKFLOW_RUN, id: 'run_1', label: 'Welcome' };

  it('sends the resource and filters as JSON', () => {
    expect(JSON.parse(serializeCopilotViewing({ resource, filters: { channels: ['email'] } }) ?? '')).toEqual({
      resource,
      filters: { channels: ['email'] },
    });
  });

  it('drops the filters, then the label, to stay within web-chat metadata limits', () => {
    const filters = { transactionId: Array.from({ length: 30 }, (_, index) => `txn_${index}_${'x'.repeat(10)}`) };

    expect(JSON.parse(serializeCopilotViewing({ resource, filters }) ?? '')).toEqual({ resource });
    expect(
      JSON.parse(serializeCopilotViewing({ resource: { ...resource, label: 'x'.repeat(600) }, filters }) ?? '')
    ).toEqual({ resource: { type: resource.type, id: resource.id } });
  });

  it('sends nothing when nothing is open or filtered, or nothing fits', () => {
    expect(serializeCopilotViewing(undefined)).toBeUndefined();
    expect(serializeCopilotViewing({})).toBeUndefined();
    expect(serializeCopilotViewing({ filters: { subscriberId: 'x'.repeat(600) } })).toBeUndefined();
  });
});

describe('parseCopilotPages', () => {
  it('reads a JSON array', () => {
    expect(parseCopilotPages(['activity', 'subscribers'])).toEqual([
      CopilotPageEnum.ACTIVITY,
      CopilotPageEnum.SUBSCRIBERS,
    ]);
  });

  it('reads a string holding a JSON array', () => {
    expect(parseCopilotPages('["integrations"]')).toEqual([CopilotPageEnum.INTEGRATIONS]);
  });

  it('drops unknown names and duplicates', () => {
    expect(parseCopilotPages(['activity', 'workflows', 'activity', 3])).toEqual([CopilotPageEnum.ACTIVITY]);
  });

  it('keeps every page off for a missing or unusable value', () => {
    expect(parseCopilotPages(undefined)).toEqual([]);
    expect(parseCopilotPages('')).toEqual([]);
    expect(parseCopilotPages('activity')).toEqual([]);
    expect(parseCopilotPages({ activity: true })).toEqual([]);
    expect(parseCopilotPages(true)).toEqual([]);
  });
});
