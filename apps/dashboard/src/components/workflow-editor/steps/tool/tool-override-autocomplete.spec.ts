import { describe, expect, it } from 'vitest';
import { getToolOverrideCompletionResult } from './tool-override-autocomplete';
import { type OverrideFieldSchema } from './tool-override-field-schema';

const fieldSchemas: Record<string, OverrideFieldSchema> = {
  incident: {
    type: 'object',
    sources: ['Incident webhook'],
    properties: {
      id: { type: 'string', sources: ['Incident webhook'] },
      severity: {
        type: 'string',
        enum: ['critical', 'warning'],
        sources: ['Incident webhook'],
      },
    },
  },
  actor: {
    type: 'string',
    sources: ['Audit webhook'],
  },
};

function labelsFor(doc: string) {
  const result = getToolOverrideCompletionResult({
    doc,
    pos: doc.length,
    explicit: true,
    fieldSchemas,
  });

  return result?.options.map((option) => option.label);
}

describe('getToolOverrideCompletionResult', () => {
  it('offers schema keys at both root and nested object cursors', () => {
    expect(labelsFor('{\n  "')).toEqual(['incident', 'actor']);
    expect(labelsFor('{"incident": {')).toEqual(['id', 'severity']);
    expect(labelsFor('{"incident": {\n  "')).toEqual(['id', 'severity']);
  });

  it('offers enum values at a nested value cursor', () => {
    expect(labelsFor('{"incident":{"severity":"cr')).toEqual(['critical']);
  });

  it('identifies source integrations in completion details', () => {
    const doc = '{"';
    const result = getToolOverrideCompletionResult({
      doc,
      pos: doc.length,
      explicit: true,
      fieldSchemas,
    });

    expect(result?.options.find((option) => option.label === 'incident')?.detail).toContain('Incident webhook');
  });

  it('follows array item schemas into nested object cursors', () => {
    const doc = '{"events":[{"';
    const result = getToolOverrideCompletionResult({
      doc,
      pos: doc.length,
      explicit: true,
      fieldSchemas: {
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
    });

    expect(result?.options.map((option) => option.label)).toEqual(['kind']);
  });
});
