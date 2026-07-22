import { describe, expect, it } from 'vitest';
import { buildAnnotatedPreviewLines } from './build-annotated-preview-lines';

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
