import { ContentIssueEnum, ToolProviderIdEnum } from '@novu/shared';
import { describe, expect, it } from 'vitest';
import {
  processProviderOverridesIssues,
  stitchProviderOverridesFromDocs,
  withStitchedProviderOverrides,
} from './provider-overrides';

describe('stitchProviderOverridesFromDocs', () => {
  it('rebuilds a providerOverrides map from STEP_PROVIDER_CONTROLS docs', () => {
    const stitched = stitchProviderOverridesFromDocs([
      {
        providerId: ToolProviderIdEnum.PagerDuty,
        controls: { severity: 'warning', summary: 'db down' },
      },
      {
        providerId: ToolProviderIdEnum.Opsgenie,
        controls: { priority: 'P2' },
      },
    ]);

    expect(stitched).toEqual({
      [ToolProviderIdEnum.PagerDuty]: { severity: 'warning', summary: 'db down' },
      [ToolProviderIdEnum.Opsgenie]: { priority: 'P2' },
    });
  });

  it('returns undefined when there are no supported provider docs', () => {
    expect(stitchProviderOverridesFromDocs([])).toBeUndefined();
    expect(stitchProviderOverridesFromDocs([{ providerId: 'tool-webhook', controls: { foo: 1 } }])).toBeUndefined();
  });
});

describe('withStitchedProviderOverrides', () => {
  it('merges providerOverrides into controls for bridge execution', () => {
    expect(
      withStitchedProviderOverrides({ body: 'default' }, { [ToolProviderIdEnum.PagerDuty]: { severity: 'info' } })
    ).toEqual({
      body: 'default',
      providerOverrides: {
        [ToolProviderIdEnum.PagerDuty]: { severity: 'info' },
      },
    });
  });
});

describe('processProviderOverridesIssues', () => {
  it('flags unknown override keys with namespaced UNSUPPORTED_PROPERTY issues', () => {
    const issues = processProviderOverridesIssues({
      [ToolProviderIdEnum.Opsgenie]: {
        message: 'db is down',
        foo: 'bar',
      },
    });

    const path = `providerOverrides.${ToolProviderIdEnum.Opsgenie}.foo`;
    expect(issues.controls?.[path]).toEqual([
      {
        message: '"foo" is not a supported property',
        issueType: ContentIssueEnum.UNSUPPORTED_PROPERTY,
        variableName: path,
      },
    ]);
  });

  it('accepts known override keys with Liquid values without issues', () => {
    const issues = processProviderOverridesIssues({
      [ToolProviderIdEnum.Opsgenie]: {
        priority: '{{payload.priority}}',
        tags: '{{payload.tags}}',
      },
      [ToolProviderIdEnum.PagerDuty]: {
        severity: '{{payload.severity}}',
        summary: '{{payload.title}}',
      },
    });

    expect(issues.controls).toBeUndefined();
  });

  it('flags unsupported provider ids', () => {
    const issues = processProviderOverridesIssues({
      'tool-webhook': { foo: 'bar' },
    } as never);

    expect(issues.controls?.['providerOverrides.tool-webhook']).toEqual([
      {
        message: '"tool-webhook" is not a supported provider for content overrides',
        issueType: ContentIssueEnum.UNSUPPORTED_PROPERTY,
        variableName: 'providerOverrides.tool-webhook',
      },
    ]);
  });
});
