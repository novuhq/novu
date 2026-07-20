import { describe, expect, it } from 'vitest';
import { ToolProviderIdEnum } from '../../../types';
import { buildAnnotatedPreviewLines, mergeToolProviderPreview } from './merge-tool-provider-preview';

describe('mergeToolProviderPreview', () => {
  it('fills omitted primary key from body and sets defaultContentKey', () => {
    const result = mergeToolProviderPreview({
      body: 'Default incident message',
      providerId: ToolProviderIdEnum.PagerDuty,
      override: { severity: 'critical' },
    });

    expect(result).toEqual({
      merged: {
        severity: 'critical',
        summary: 'Default incident message',
      },
      defaultContentKey: 'summary',
    });
  });

  it('keeps a non-empty primary key override and omits defaultContentKey', () => {
    const result = mergeToolProviderPreview({
      body: 'Default incident message',
      providerId: ToolProviderIdEnum.Opsgenie,
      override: { message: 'Override alert', priority: 'P1' },
    });

    expect(result).toEqual({
      merged: {
        message: 'Override alert',
        priority: 'P1',
      },
    });
    expect(result.defaultContentKey).toBeUndefined();
  });

  it('treats empty-string primary key as missing and fills from body', () => {
    const result = mergeToolProviderPreview({
      body: 'Default incident message',
      providerId: ToolProviderIdEnum.PagerDuty,
      override: { summary: '', severity: 'warning' },
    });

    expect(result).toEqual({
      merged: {
        summary: 'Default incident message',
        severity: 'warning',
      },
      defaultContentKey: 'summary',
    });
  });

  it('treats null primary key as missing and fills from body', () => {
    const result = mergeToolProviderPreview({
      body: 'Default opsgenie message',
      providerId: ToolProviderIdEnum.Opsgenie,
      override: { message: null },
    });

    expect(result).toEqual({
      merged: {
        message: 'Default opsgenie message',
      },
      defaultContentKey: 'message',
    });
  });
});

describe('buildAnnotatedPreviewLines', () => {
  it('marks only the first line of the default-content property and formats nested values', () => {
    const lines = buildAnnotatedPreviewLines(
      {
        severity: 'critical',
        summary: 'Default incident message',
        custom_details: { region: 'us-east-1', count: 2 },
        links: [{ href: 'https://example.com', text: 'Runbook' }],
      },
      'summary'
    );

    expect(lines[0]).toEqual({ json: '{' });
    expect(lines.at(-1)).toEqual({ json: '}' });

    const summaryLine = lines.find((line) => line.json.includes('"summary"'));
    expect(summaryLine).toEqual({
      json: '  "summary": "Default incident message",',
      isDefaultContentKey: true,
    });

    const markedCount = lines.filter((line) => line.isDefaultContentKey).length;
    expect(markedCount).toBe(1);

    expect(lines.map((line) => line.json).join('\n')).toBe(
      [
        '{',
        '  "severity": "critical",',
        '  "summary": "Default incident message",',
        '  "custom_details": {',
        '    "region": "us-east-1",',
        '    "count": 2',
        '  },',
        '  "links": [',
        '    {',
        '      "href": "https://example.com",',
        '      "text": "Runbook"',
        '    }',
        '  ]',
        '}',
      ].join('\n')
    );

    expect(lines.every((line) => !line.json.includes('DEFAULT CONTENT'))).toBe(true);
  });

  it('leaves every line unmarked when defaultContentKey is omitted', () => {
    const lines = buildAnnotatedPreviewLines({
      message: 'Override alert',
      priority: 'P1',
    });

    expect(lines.every((line) => !line.isDefaultContentKey)).toBe(true);
    expect(lines.map((line) => line.json).join('\n')).toBe(
      ['{', '  "message": "Override alert",', '  "priority": "P1"', '}'].join('\n')
    );
  });
});
