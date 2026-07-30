import {
  ChatProviderIdEnum,
  CONTENT_OVERRIDE_PROVIDER_IDS,
  ContentIssueEnum,
  getProviderOverrideConfig,
  PushProviderIdEnum,
  ToolProviderIdEnum,
} from '@novu/shared';
import { describe, expect, it } from 'vitest';
import {
  LIQUID_TOLERANT_SCHEMAS_BY_SUBPATH,
  processProviderOverridesIssues,
  stitchProviderOverridesFromDocs,
  withStitchedProviderOverrides,
} from './provider-overrides';

const slackPath = (pointer?: string) =>
  pointer
    ? `providerOverrides.${ChatProviderIdEnum.Slack}.${pointer}`
    : `providerOverrides.${ChatProviderIdEnum.Slack}`;

describe('LIQUID_TOLERANT_SCHEMAS_BY_SUBPATH', () => {
  it('registers every schema subpath the shared provider registry points at', () => {
    const subpaths = CONTENT_OVERRIDE_PROVIDER_IDS.map(
      (providerId) => getProviderOverrideConfig(providerId)?.schemaSubpath
    ).filter((subpath): subpath is string => Boolean(subpath));

    expect(subpaths.length).toBeGreaterThan(0);
    expect(subpaths.filter((subpath) => !(subpath in LIQUID_TOLERANT_SCHEMAS_BY_SUBPATH))).toEqual([]);
  });
});

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

  it('reports only the missing elements field for an incomplete Slack actions block', () => {
    const issues = processProviderOverridesIssues({
      [ChatProviderIdEnum.Slack]: {
        blocks: [{ type: 'actions' }],
      },
    });

    const allIssues = Object.values(issues.controls ?? {}).flat();

    expect(allIssues).toEqual([
      {
        message: 'Elements is required',
        issueType: ContentIssueEnum.MISSING_VALUE,
        variableName: slackPath('blocks.0.elements'),
      },
    ]);
  });

  it.each([
    { type: 'actions', elements: [] },
    { type: 'context', elements: [] },
    { type: 'context_actions', elements: [] },
    { type: 'carousel', elements: [] },
  ])('reports a Slack $type block whose elements array is empty, which Slack rejects as invalid_blocks', (block) => {
    const issues = processProviderOverridesIssues({
      [ChatProviderIdEnum.Slack]: {
        blocks: [block],
      },
    });

    expect(issues.controls?.[slackPath('blocks.0.elements')]).toEqual([
      {
        message: 'must NOT have fewer than 1 items',
        issueType: ContentIssueEnum.MISSING_VALUE,
        variableName: slackPath('blocks.0.elements'),
      },
    ]);
  });

  it('accepts a Slack actions block once it holds an element, or a Liquid template in its place', () => {
    const issues = processProviderOverridesIssues({
      [ChatProviderIdEnum.Slack]: {
        blocks: [
          {
            type: 'actions',
            elements: [{ type: 'button', text: { type: 'plain_text', text: 'View' }, url: 'https://example.com' }],
          },
          { type: 'actions', elements: '{{payload.actions}}' },
        ],
      },
    });

    expect(issues.controls).toBeUndefined();
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
      [ChatProviderIdEnum.MsTeams]: { text: 'hi', whatever: 1 },
    });

    expect(issues.controls).toBeUndefined();
  });

  it('accepts free-form objects for escape-hatch push providers', () => {
    const issues = processProviderOverridesIssues({
      [PushProviderIdEnum.FCM]: {
        data: { orderId: '{{payload.orderId}}' },
        android: { priority: 'high' },
      },
    });

    expect(issues.controls).toBeUndefined();
  });

  it('accepts known Expo override keys without control issues', () => {
    const issues = processProviderOverridesIssues({
      [PushProviderIdEnum.EXPO]: {
        priority: 'high',
        channelId: 'orders',
        interruptionLevel: 'time-sensitive',
      },
    });

    expect(issues.controls).toBeUndefined();
  });

  it('flags a typo in an Expo override key with a namespaced path', () => {
    const issues = processProviderOverridesIssues({
      [PushProviderIdEnum.EXPO]: {
        priority: 'high',
        chanelId: 'orders',
      },
    });

    expect(issues.controls?.['providerOverrides.expo.chanelId']).toEqual([
      {
        message: '"chanelId" is not a supported property',
        issueType: ContentIssueEnum.UNSUPPORTED_PROPERTY,
        variableName: 'providerOverrides.expo.chanelId',
      },
    ]);
  });

  it.each([null, [], 'not-an-object'])('rejects malformed fcm override value %j', (override) => {
    const issues = processProviderOverridesIssues({
      [PushProviderIdEnum.FCM]: override,
    } as never);

    expect(issues.controls?.[`providerOverrides.${PushProviderIdEnum.FCM}`]).toBeDefined();
  });

  it('validates Telegram overrides against the generated sendMessage schema', () => {
    const valid = processProviderOverridesIssues({
      [ChatProviderIdEnum.Telegram]: {
        text: '{{payload.title}}',
        parse_mode: 'MarkdownV2',
        disable_notification: true,
      },
    });

    expect(valid.controls).toBeUndefined();

    const invalid = processProviderOverridesIssues({
      [ChatProviderIdEnum.Telegram]: { text: 'hi', whatever: 1 },
    });

    expect(invalid.controls?.['providerOverrides.telegram.whatever']).toEqual([
      {
        message: '"whatever" is not a supported property',
        issueType: ContentIssueEnum.UNSUPPORTED_PROPERTY,
        variableName: 'providerOverrides.telegram.whatever',
      },
    ]);
  });

  it('reports the provider schema error rather than the step-control URL message', () => {
    const issues = processProviderOverridesIssues({
      [ChatProviderIdEnum.Slack]: {
        blocks: [{ type: 'section', text: { type: 'mrkdwn', text: 'x' }, accessory: { type: 'button', url: 12 } }],
      },
    });

    const messages = Object.values(issues.controls ?? {})
      .flat()
      .map((issue) => issue.message);

    expect(messages.length).toBeGreaterThan(0);
    expect(messages.every((message) => !message.includes('path starting with /'))).toBe(true);
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

  it('narrows WhatsApp MediaObject oneOf errors when id and link are both present', () => {
    const issues = processProviderOverridesIssues({
      [ChatProviderIdEnum.WhatsAppBusiness]: {
        document: {
          id: 'ads',
          link: 'https://example.com/doc',
          text: { body: 'adad', preview_url: false },
        },
      },
    });

    expect(Object.keys(issues.controls ?? {})).toEqual([
      'providerOverrides.whatsapp-business.document.link',
      'providerOverrides.whatsapp-business.document.text',
    ]);
  });

  it('narrows WhatsApp MediaObject oneOf errors when neither id nor link is present', () => {
    const issues = processProviderOverridesIssues({
      [ChatProviderIdEnum.WhatsAppBusiness]: {
        document: {
          text: { body: 'adad', preview_url: false },
        },
      },
    });

    expect(Object.keys(issues.controls ?? {})).toEqual([
      'providerOverrides.whatsapp-business.document.id',
      'providerOverrides.whatsapp-business.document.text',
    ]);
    expect(issues.controls?.['providerOverrides.whatsapp-business.document.link']).toBeUndefined();
  });
});
