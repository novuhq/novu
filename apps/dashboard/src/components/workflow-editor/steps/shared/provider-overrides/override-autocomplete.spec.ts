import { describe, expect, it } from 'vitest';
import { getOverrideCompletionResult } from './override-autocomplete';
import { type OverrideFieldSchema } from './override-field-schema';

const rootSchema: OverrideFieldSchema = {
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

function labelsFor(doc: string) {
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

  it('shows the field type in completion details', () => {
    const doc = '{"';
    const result = getOverrideCompletionResult({ doc, pos: doc.length, explicit: true, rootSchema });

    expect(result?.options.find((option) => option.label === 'incident')?.detail).toBe('object');
  });

  it('appends caller-supplied annotations to completion info', () => {
    const doc = '{"';
    const result = getOverrideCompletionResult({
      doc,
      pos: doc.length,
      explicit: true,
      rootSchema,
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
});
