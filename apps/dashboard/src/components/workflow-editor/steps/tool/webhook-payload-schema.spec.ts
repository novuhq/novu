import { describe, expect, it } from 'vitest';
import { getActiveWebhookSchemaSources, mergeWebhookPayloadSchemas } from './webhook-payload-schema';

describe('mergeWebhookPayloadSchemas', () => {
  it('unions properties and attributes each field to its source integration', () => {
    const result = mergeWebhookPayloadSchemas([
      {
        name: 'Incident webhook',
        identifier: 'incident-webhook',
        payloadSchema: JSON.stringify({
          type: 'object',
          properties: { incidentId: { type: 'string' } },
        }),
      },
      {
        name: 'Audit webhook',
        identifier: 'audit-webhook',
        payloadSchema: JSON.stringify({
          type: 'object',
          properties: { actor: { type: 'string' } },
        }),
      },
    ]);

    expect(result.properties.incidentId.sources).toEqual([
      { name: 'Incident webhook', identifier: 'incident-webhook' },
    ]);
    expect(result.properties.actor.sources).toEqual([{ name: 'Audit webhook', identifier: 'audit-webhook' }]);
  });

  it('recursively merges compatible nested object properties', () => {
    const result = mergeWebhookPayloadSchemas([
      {
        name: 'Incident webhook',
        identifier: 'incident-webhook',
        payloadSchema: JSON.stringify({
          type: 'object',
          properties: {
            incident: {
              type: 'object',
              properties: { id: { type: 'string' } },
            },
          },
        }),
      },
      {
        name: 'Escalation webhook',
        identifier: 'escalation-webhook',
        payloadSchema: JSON.stringify({
          type: 'object',
          properties: {
            incident: {
              type: 'object',
              properties: { priority: { type: 'number' } },
            },
          },
        }),
      },
    ]);

    expect(result.properties.incident.sources).toEqual([
      { name: 'Incident webhook', identifier: 'incident-webhook' },
      { name: 'Escalation webhook', identifier: 'escalation-webhook' },
    ]);
    expect(result.properties.incident.properties?.id.sources).toEqual([
      { name: 'Incident webhook', identifier: 'incident-webhook' },
    ]);
    expect(result.properties.incident.properties?.priority.sources).toEqual([
      { name: 'Escalation webhook', identifier: 'escalation-webhook' },
    ]);
  });

  it('conservatively merges compatible constraints from every source', () => {
    const result = mergeWebhookPayloadSchemas([
      {
        name: 'Broad webhook',
        identifier: 'broad-webhook',
        payloadSchema: JSON.stringify({
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['open', 'closed'], maxLength: 20 },
          },
        }),
      },
      {
        name: 'Strict webhook',
        identifier: 'strict-webhook',
        payloadSchema: JSON.stringify({
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['open', 'pending'], maxLength: 10 },
          },
        }),
      },
    ]);

    expect(result.properties.status.enum).toEqual(['open']);
    expect(result.properties.status.maxLength).toBe(10);
  });

  it('retains every source and type when schemas collide', () => {
    const result = mergeWebhookPayloadSchemas([
      {
        name: 'String webhook',
        identifier: 'string-webhook',
        payloadSchema: JSON.stringify({
          type: 'object',
          properties: { incident: { type: 'string' } },
        }),
      },
      {
        name: 'Object webhook',
        identifier: 'object-webhook',
        payloadSchema: JSON.stringify({
          type: 'object',
          properties: { incident: { type: 'object', properties: {} } },
        }),
      },
    ]);

    expect(result.properties.incident.conflicts).toEqual([
      { source: { name: 'String webhook', identifier: 'string-webhook' }, type: 'string' },
      { source: { name: 'Object webhook', identifier: 'object-webhook' }, type: 'object' },
    ]);
    expect(result.properties.incident.sources).toEqual([
      { name: 'String webhook', identifier: 'string-webhook' },
      { name: 'Object webhook', identifier: 'object-webhook' },
    ]);
  });

  it('keeps same-named integrations distinct by identifier', () => {
    const result = mergeWebhookPayloadSchemas([
      {
        name: 'Webhook',
        identifier: 'webhook-a',
        payloadSchema: JSON.stringify({
          type: 'object',
          properties: { incident: { type: 'string' } },
        }),
      },
      {
        name: 'Webhook',
        identifier: 'webhook-b',
        payloadSchema: JSON.stringify({
          type: 'object',
          properties: { incident: { type: 'number' } },
        }),
      },
    ]);

    expect(result.properties.incident.sources).toEqual([
      { name: 'Webhook', identifier: 'webhook-a' },
      { name: 'Webhook', identifier: 'webhook-b' },
    ]);
    expect(result.properties.incident.conflicts).toEqual([
      { source: { name: 'Webhook', identifier: 'webhook-a' }, type: 'string' },
      { source: { name: 'Webhook', identifier: 'webhook-b' }, type: 'number' },
    ]);
  });

  it('ignores invalid and absent schemas without discarding valid schemas', () => {
    const result = mergeWebhookPayloadSchemas([
      { name: 'Invalid webhook', identifier: 'invalid-webhook', payloadSchema: '{' },
      { name: 'Missing webhook', identifier: 'missing-webhook' },
      {
        name: 'Valid webhook',
        identifier: 'valid-webhook',
        payloadSchema: JSON.stringify({
          type: 'object',
          properties: { event: { type: 'string' } },
        }),
      },
    ]);

    expect(Object.keys(result.properties)).toEqual(['event']);
    expect(result.ignoredSources).toEqual([
      { name: 'Invalid webhook', identifier: 'invalid-webhook' },
      { name: 'Missing webhook', identifier: 'missing-webhook' },
    ]);
  });

  it('only selects active, non-deleted webhook integrations as schema sources', () => {
    const sources = getActiveWebhookSchemaSources([
      {
        active: true,
        deleted: false,
        providerId: 'tool-webhook',
        name: 'Active webhook',
        identifier: 'active-webhook',
        configurations: { payloadSchema: '{"type":"object","properties":{}}' },
      },
      {
        active: false,
        deleted: false,
        providerId: 'tool-webhook',
        name: 'Inactive webhook',
        identifier: 'inactive-webhook',
        configurations: { payloadSchema: '{"type":"object","properties":{}}' },
      },
      {
        active: true,
        deleted: true,
        providerId: 'tool-webhook',
        name: 'Deleted webhook',
        identifier: 'deleted-webhook',
        configurations: { payloadSchema: '{"type":"object","properties":{}}' },
      },
      {
        active: true,
        deleted: false,
        providerId: 'pagerduty',
        name: 'PagerDuty',
        identifier: 'pagerduty',
        configurations: { payloadSchema: '{"type":"object","properties":{}}' },
      },
    ]);

    expect(sources).toEqual([
      {
        name: 'Active webhook',
        identifier: 'active-webhook',
        payloadSchema: '{"type":"object","properties":{}}',
      },
    ]);
  });

  it('treats Object.prototype property names as regular schema fields', () => {
    const result = mergeWebhookPayloadSchemas([
      {
        name: 'Webhook A',
        identifier: 'webhook-a',
        payloadSchema: JSON.stringify({
          type: 'object',
          properties: { toString: { type: 'string' } },
        }),
      },
      {
        name: 'Webhook B',
        identifier: 'webhook-b',
        payloadSchema: JSON.stringify({
          type: 'object',
          properties: { toString: { type: 'number' } },
        }),
      },
    ]);

    expect(result.properties.toString.type).toBe('string');
    expect(result.properties.toString.conflicts).toEqual([
      { source: { name: 'Webhook A', identifier: 'webhook-a' }, type: 'string' },
      { source: { name: 'Webhook B', identifier: 'webhook-b' }, type: 'number' },
    ]);
  });
});
