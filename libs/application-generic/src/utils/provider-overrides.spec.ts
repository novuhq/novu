import { ChatProviderIdEnum, ContentIssueEnum, ToolProviderIdEnum } from '@novu/shared';
import { describe, expect, it } from 'vitest';
import {
  processProviderOverridesIssues,
  stitchProviderOverridesFromDocs,
  withStitchedProviderOverrides,
} from './provider-overrides';

const slackPath = (pointer?: string) =>
  pointer
    ? `providerOverrides.${ChatProviderIdEnum.Slack}.${pointer}`
    : `providerOverrides.${ChatProviderIdEnum.Slack}`;

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

  it('stitches tool-webhook provider docs', () => {
    expect(stitchProviderOverridesFromDocs([{ providerId: ToolProviderIdEnum.Webhook, controls: { foo: 1 } }])).toEqual(
      {
        [ToolProviderIdEnum.Webhook]: { foo: 1 },
      }
    );
  });

  it('stitches chat provider docs alongside tool ones', () => {
    expect(
      stitchProviderOverridesFromDocs([
        { providerId: ChatProviderIdEnum.Slack, controls: { text: 'hi', blocks: [{ type: 'divider' }] } },
        { providerId: ChatProviderIdEnum.Discord, controls: { content: 'hi' } },
        { providerId: ToolProviderIdEnum.PagerDuty, controls: { severity: 'info' } },
      ])
    ).toEqual({
      [ChatProviderIdEnum.Slack]: { text: 'hi', blocks: [{ type: 'divider' }] },
      [ChatProviderIdEnum.Discord]: { content: 'hi' },
      [ToolProviderIdEnum.PagerDuty]: { severity: 'info' },
    });
  });

  it('drops docs for provider ids that support no overrides', () => {
    expect(stitchProviderOverridesFromDocs([{ providerId: 'novu-email', controls: { subject: 'x' } }])).toBeUndefined();
  });

  it('returns undefined when there are no supported provider docs', () => {
    expect(stitchProviderOverridesFromDocs([])).toBeUndefined();
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

  it('accepts arbitrary object keys for tool-webhook', () => {
    const issues = processProviderOverridesIssues({
      [ToolProviderIdEnum.Webhook]: {
        event: '{{payload.event}}',
        nested: { any: 'value' },
      },
    });

    expect(issues.controls).toBeUndefined();
  });

  it.each([null, [], 'not-an-object'])('rejects malformed tool-webhook override value %j', (override) => {
    const issues = processProviderOverridesIssues({
      [ToolProviderIdEnum.Webhook]: override,
    } as never);

    expect(issues.controls?.[`providerOverrides.${ToolProviderIdEnum.Webhook}`]).toBeDefined();
  });

  it('accepts a Liquid template in boolean, enum and array positions', () => {
    const issues = processProviderOverridesIssues({
      [ChatProviderIdEnum.Slack]: {
        mrkdwn: '{{payload.useMarkdown}}',
        unfurl_links: '{% if payload.unfurl %}true{% endif %}',
        blocks: '{{payload.blocks}}',
      },
      [ToolProviderIdEnum.PagerDuty]: {
        severity: '{{payload.severity}}',
        links: '{{payload.links}}',
      },
      [ToolProviderIdEnum.Opsgenie]: {
        priority: '{{payload.priority}}',
        tags: '{{payload.tags}}',
        responders: [{ type: '{{payload.responderType}}', id: '{{payload.responderId}}' }],
      },
    });

    expect(issues.controls).toBeUndefined();
  });

  it('flags a misspelled key nested inside a Slack Block Kit block', () => {
    const issues = processProviderOverridesIssues({
      [ChatProviderIdEnum.Slack]: {
        blocks: [{ type: 'image', image_url: 'https://example.com/a.png', alt_text: 'a', img_url: 'oops' }],
      },
    });

    expect(issues.controls?.[slackPath('blocks.0.img_url')]).toEqual([
      {
        message: '"img_url" is not a supported property',
        issueType: ContentIssueEnum.UNSUPPORTED_PROPERTY,
        variableName: slackPath('blocks.0.img_url'),
      },
    ]);
  });

  it('reports an unknown Slack block type on the type field instead of dumping every branch', () => {
    const issues = processProviderOverridesIssues({
      [ChatProviderIdEnum.Slack]: {
        blocks: [{ type: 'imagee', image_url: 'https://example.com/a.png', alt_text: 'a' }],
      },
    });

    const allIssues = Object.values(issues.controls ?? {}).flat();

    expect(issues.controls?.[slackPath('blocks.0.type')]).toBeDefined();
    expect(allIssues.every((issue) => !issue.message.includes('must match a schema in anyOf'))).toBe(true);
    expect(allIssues.length).toBeLessThan(5);
  });

  it('reports nothing for escape-hatch chat providers whose keys cannot be described up front', () => {
    const issues = processProviderOverridesIssues({
      [ChatProviderIdEnum.Discord]: { content: '{{payload.body}}', embeds: [{ anything: true }] },
      [ChatProviderIdEnum.Telegram]: { text: 'hi', parse_mode: 'MarkdownV2', whatever: 1 },
    });

    expect(issues.controls).toBeUndefined();
  });

  it('rejects an override for a provider that supports no overrides at all', () => {
    const issues = processProviderOverridesIssues({ 'not-a-provider': { foo: 1 } } as never);

    expect(issues.controls?.['providerOverrides.not-a-provider']).toEqual([
      {
        message: '"not-a-provider" is not a supported property',
        issueType: ContentIssueEnum.UNSUPPORTED_PROPERTY,
        variableName: 'providerOverrides.not-a-provider',
      },
    ]);
  });
});
