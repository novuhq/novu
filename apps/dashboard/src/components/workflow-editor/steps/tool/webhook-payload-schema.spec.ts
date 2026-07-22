import { describe, expect, it } from 'vitest';
import { getActiveWebhookSchemaSources, mergeWebhookPayloadSchemas } from './webhook-payload-schema';

describe('mergeWebhookPayloadSchemas', () => {
  it('unions properties and attributes each field to its source integration', () => {
    const result = mergeWebhookPayloadSchemas([
      {
        name: 'Incident webhook',
        payloadSchema: JSON.stringify({
          type: 'object',
          properties: { incidentId: { type: 'string' } },
        }),
      },
      {
        name: 'Audit webhook',
        payloadSchema: JSON.stringify({
          type: 'object',
          properties: { actor: { type: 'string' } },
        }),
      },
    ]);

    expect(result.properties.incidentId.sources).toEqual(['Incident webhook']);
    expect(result.properties.actor.sources).toEqual(['Audit webhook']);
  });

  it('recursively merges compatible nested object properties', () => {
    const result = mergeWebhookPayloadSchemas([
      {
        name: 'Incident webhook',
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

    expect(result.properties.incident.sources).toEqual(['Incident webhook', 'Escalation webhook']);
    expect(result.properties.incident.properties?.id.sources).toEqual(['Incident webhook']);
    expect(result.properties.incident.properties?.priority.sources).toEqual(['Escalation webhook']);
  });

  it('conservatively merges compatible constraints from every source', () => {
    const result = mergeWebhookPayloadSchemas([
      {
        name: 'Broad webhook',
        payloadSchema: JSON.stringify({
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['open', 'closed'], maxLength: 20 },
          },
        }),
      },
      {
        name: 'Strict webhook',
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
        payloadSchema: JSON.stringify({
          type: 'object',
          properties: { incident: { type: 'string' } },
        }),
      },
      {
        name: 'Object webhook',
        payloadSchema: JSON.stringify({
          type: 'object',
          properties: { incident: { type: 'object', properties: {} } },
        }),
      },
    ]);

    expect(result.properties.incident.conflicts).toEqual([
      { source: 'String webhook', type: 'string' },
      { source: 'Object webhook', type: 'object' },
    ]);
    expect(result.properties.incident.sources).toEqual(['String webhook', 'Object webhook']);
  });

  it('ignores invalid and absent schemas without discarding valid schemas', () => {
    const result = mergeWebhookPayloadSchemas([
      { name: 'Invalid webhook', payloadSchema: '{' },
      { name: 'Missing webhook' },
      {
        name: 'Valid webhook',
        payloadSchema: JSON.stringify({
          type: 'object',
          properties: { event: { type: 'string' } },
        }),
      },
    ]);

    expect(Object.keys(result.properties)).toEqual(['event']);
    expect(result.ignoredSources).toEqual(['Invalid webhook', 'Missing webhook']);
  });

  it('only selects active, non-deleted webhook integrations as schema sources', () => {
    const sources = getActiveWebhookSchemaSources([
      {
        active: true,
        deleted: false,
        providerId: 'tool-webhook',
        name: 'Active webhook',
        configurations: { payloadSchema: '{"type":"object","properties":{}}' },
      },
      {
        active: false,
        deleted: false,
        providerId: 'tool-webhook',
        name: 'Inactive webhook',
        configurations: { payloadSchema: '{"type":"object","properties":{}}' },
      },
      {
        active: true,
        deleted: true,
        providerId: 'tool-webhook',
        name: 'Deleted webhook',
        configurations: { payloadSchema: '{"type":"object","properties":{}}' },
      },
      {
        active: true,
        deleted: false,
        providerId: 'pagerduty',
        name: 'PagerDuty',
        configurations: { payloadSchema: '{"type":"object","properties":{}}' },
      },
    ]);

    expect(sources).toEqual([
      {
        name: 'Active webhook',
        payloadSchema: '{"type":"object","properties":{}}',
      },
    ]);
  });
});
