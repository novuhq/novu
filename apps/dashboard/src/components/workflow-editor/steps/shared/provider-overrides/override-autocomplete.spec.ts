import { describe, expect, it } from 'vitest';
import { getOverrideCompletionResult } from './override-autocomplete';
import { type OverrideFieldSchema } from './override-field-schema';

const webhookRootSchema: OverrideFieldSchema = {
  type: 'object',
  properties: {
    incident: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        severity: { type: 'string', enum: ['critical', 'warning'] },
      },
    },
    actor: { type: 'string' },
  },
};

const blockKitRootSchema: OverrideFieldSchema = {
  type: 'object',
  properties: {
    text: { type: 'string' },
    blocks: { type: 'array', items: { $ref: '#/definitions/KnownBlock' } },
  },
  definitions: {
    KnownBlock: {
      anyOf: [{ $ref: '#/definitions/SectionBlock' }, { $ref: '#/definitions/DividerBlock' }],
    },
    SectionBlock: {
      type: 'object',
      properties: {
        type: { type: 'string', const: 'section' },
        block_id: { type: 'string' },
        fields: { type: 'array', items: { $ref: '#/definitions/TextObject' } },
      },
    },
    DividerBlock: {
      type: 'object',
      properties: {
        type: { type: 'string', const: 'divider' },
        block_id: { type: 'string' },
      },
    },
    TextObject: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['plain_text', 'mrkdwn'] },
        text: { type: 'string' },
      },
    },
  },
};

function labelsFor(doc: string, rootSchema: OverrideFieldSchema = webhookRootSchema) {
  const result = getOverrideCompletionResult({
    doc,
    pos: doc.length,
    explicit: true,
    rootSchema,
  });

  return result?.options.map((option) => option.label);
}

describe('getOverrideCompletionResult', () => {
  it('offers schema keys at both root and nested object cursors', () => {
    expect(labelsFor('{\n  "')).toEqual(['incident', 'actor']);
    expect(labelsFor('{"incident": {')).toEqual(['id', 'severity']);
    expect(labelsFor('{"incident": {\n  "')).toEqual(['id', 'severity']);
  });

  it('offers enum values at a nested value cursor', () => {
    expect(labelsFor('{"incident":{"severity":"cr')).toEqual(['critical']);
  });

  it('narrows enum values as the typed prefix grows', () => {
    const blockTypes: OverrideFieldSchema = {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['actions', 'alert', 'card', 'carousel', 'context', 'context_actions', 'divider'],
        },
      },
    };

    expect(labelsFor('{"type":"', blockTypes)).toEqual([
      'actions',
      'alert',
      'card',
      'carousel',
      'context',
      'context_actions',
      'divider',
    ]);
    expect(labelsFor('{"type":"c', blockTypes)).toEqual(['card', 'carousel', 'context', 'context_actions']);
    expect(labelsFor('{"type":"card', blockTypes)).toEqual(['card']);
  });

  it('narrows property keys as the typed prefix grows', () => {
    expect(labelsFor('{"')).toEqual(['incident', 'actor']);
    expect(labelsFor('{"a')).toEqual(['actor']);
    expect(labelsFor('{"inc')).toEqual(['incident']);
  });

  it('re-queries on further typing instead of freezing the first result', () => {
    const doc = '{"incident":{"severity":"c';
    const result = getOverrideCompletionResult({
      doc,
      pos: doc.length,
      explicit: true,
      rootSchema: webhookRootSchema,
    });

    // A sticky validFor + filter:false previously kept the unfiltered first result open.
    expect(result?.validFor).toBeUndefined();
    expect(result?.options.map((option) => option.label)).toEqual(['critical']);
  });

  it('shows the field type in completion details', () => {
    const doc = '{"';
    const result = getOverrideCompletionResult({ doc, pos: doc.length, explicit: true, rootSchema: webhookRootSchema });

    expect(result?.options.find((option) => option.label === 'incident')?.detail).toBe('object');
  });

  it('appends caller-supplied annotations to completion info', () => {
    const doc = '{"';
    const result = getOverrideCompletionResult({
      doc,
      pos: doc.length,
      explicit: true,
      rootSchema: webhookRootSchema,
      describeField: (key) => [`Sources: ${key} webhook`],
    });

    expect(result?.options.find((option) => option.label === 'actor')?.info).toContain('Sources: actor webhook');
  });

  it('follows array item schemas into nested object cursors', () => {
    const doc = '{"events":[{"';
    const result = getOverrideCompletionResult({
      doc,
      pos: doc.length,
      explicit: true,
      rootSchema: {
        type: 'object',
        properties: {
          events: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                kind: { type: 'string', enum: ['created', 'updated'] },
              },
            },
          },
        },
      },
    });

    expect(result?.options.map((option) => option.label)).toEqual(['kind']);
  });

  it('asks for a block type before any branch of an anyOf union is chosen', () => {
    expect(labelsFor('{"blocks":[{"', blockKitRootSchema)).toEqual(['type']);
    expect(labelsFor('{"blocks":[{"type":"', blockKitRootSchema)).toEqual(['section', 'divider']);
  });

  it('narrows to one branch once the discriminator is set', () => {
    expect(labelsFor('{"blocks":[{"type":"section","', blockKitRootSchema)).toEqual(['block_id', 'fields']);
    expect(labelsFor('{"blocks":[{"type":"divider","', blockKitRootSchema)).toEqual(['block_id']);
  });

  it('follows $ref pointers into array items nested inside a branch', () => {
    expect(labelsFor('{"blocks":[{"type":"section","fields":[{"', blockKitRootSchema)).toEqual(['type', 'text']);
    expect(labelsFor('{"blocks":[{"type":"section","fields":[{"type":"', blockKitRootSchema)).toEqual([
      'plain_text',
      'mrkdwn',
    ]);
  });

  it('reports array item types resolved through a $ref', () => {
    const doc = '{"';
    const result = getOverrideCompletionResult({
      doc,
      pos: doc.length,
      explicit: true,
      rootSchema: blockKitRootSchema,
    });

    expect(result?.options.find((option) => option.label === 'blocks')?.detail).toBe('array');
  });
});
