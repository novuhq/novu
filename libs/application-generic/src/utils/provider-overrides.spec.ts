import {
  ChatProviderIdEnum,
  CONTENT_OVERRIDE_PROVIDER_IDS,
  ContentIssueEnum,
  getProviderOverrideConfig,
  INTEGRATION_OVERRIDES_OUTPUT_KEY,
  ToolProviderIdEnum,
} from '@novu/shared';
import { describe, expect, it } from 'vitest';
import {
  LIQUID_TOLERANT_SCHEMAS_BY_SUBPATH,
  processIntegrationOverridesIssues,
  processProviderOverridesIssues,
  stitchIntegrationOverridesFromDocs,
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

  it('ignores integration override docs so they never stand in for the provider override', () => {
    expect(
      stitchProviderOverridesFromDocs([
        { providerId: ToolProviderIdEnum.Webhook, integrationIdentifier: 'prod-alerts', controls: { env: 'prod' } },
      ])
    ).toBeUndefined();
  });

  it('returns undefined when there are no supported provider docs', () => {
    expect(stitchProviderOverridesFromDocs([])).toBeUndefined();
  });
});

describe('stitchIntegrationOverridesFromDocs', () => {
  it('groups STEP_INTEGRATION_CONTROLS docs by provider, then by integration identifier', () => {
    expect(
      stitchIntegrationOverridesFromDocs([
        { providerId: ToolProviderIdEnum.Webhook, integrationIdentifier: 'prod-alerts', controls: { env: 'prod' } },
        { providerId: ToolProviderIdEnum.Webhook, integrationIdentifier: 'staging-alerts', controls: { env: 'stg' } },
        { providerId: ChatProviderIdEnum.Slack, integrationIdentifier: 'acme-slack', controls: { text: 'hi' } },
      ])
    ).toEqual({
      [ToolProviderIdEnum.Webhook]: {
        'prod-alerts': { env: 'prod' },
        'staging-alerts': { env: 'stg' },
      },
      [ChatProviderIdEnum.Slack]: {
        'acme-slack': { text: 'hi' },
      },
    });
  });

  it('drops docs without an integration identifier or for providers that support no overrides', () => {
    expect(
      stitchIntegrationOverridesFromDocs([
        { providerId: ToolProviderIdEnum.Webhook, controls: { env: 'prod' } },
        { providerId: 'novu-email', integrationIdentifier: 'mail', controls: { subject: 'x' } },
      ])
    ).toBeUndefined();
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

  it('merges integrationOverrides alongside providerOverrides', () => {
    expect(
      withStitchedProviderOverrides(
        { body: 'default' },
        { [ToolProviderIdEnum.Webhook]: { env: 'all' } },
        { [ToolProviderIdEnum.Webhook]: { 'prod-alerts': { env: 'prod' } } }
      )
    ).toEqual({
      body: 'default',
      providerOverrides: { [ToolProviderIdEnum.Webhook]: { env: 'all' } },
      integrationOverrides: { [ToolProviderIdEnum.Webhook]: { 'prod-alerts': { env: 'prod' } } },
    });
  });

  it('stitches integrationOverrides even when the step has no provider-level overrides', () => {
    expect(
      withStitchedProviderOverrides({ body: 'default' }, undefined, {
        [ToolProviderIdEnum.Webhook]: { 'prod-alerts': { env: 'prod' } },
      })
    ).toEqual({
      body: 'default',
      integrationOverrides: { [ToolProviderIdEnum.Webhook]: { 'prod-alerts': { env: 'prod' } } },
    });
  });

  it('returns the controls untouched when there is nothing to stitch', () => {
    const controls = { body: 'default' };

    expect(withStitchedProviderOverrides(controls, undefined, undefined)).toBe(controls);
  });
});

describe('processIntegrationOverridesIssues', () => {
  it('validates each integration override against its provider schema, namespaced by identifier', () => {
    const issues = processIntegrationOverridesIssues({
      [ToolProviderIdEnum.Opsgenie]: {
        'ops-eu': { message: 'db is down', foo: 'bar' },
        'ops-us': { priority: '{{payload.priority}}' },
      },
    });

    const path = `integrationOverrides.${ToolProviderIdEnum.Opsgenie}.ops-eu.foo`;
    expect(issues.controls).toEqual({
      [path]: [
        {
          message: '"foo" is not a supported property',
          issueType: ContentIssueEnum.UNSUPPORTED_PROPERTY,
          variableName: path,
        },
      ],
    });
  });

  it('rejects the reserved bridge key inside an integration override', () => {
    const path = `integrationOverrides.${ToolProviderIdEnum.Webhook}.prod-alerts.${INTEGRATION_OVERRIDES_OUTPUT_KEY}`;
    const issues = processIntegrationOverridesIssues({
      [ToolProviderIdEnum.Webhook]: { 'prod-alerts': { [INTEGRATION_OVERRIDES_OUTPUT_KEY]: {} } },
    });

    expect(issues.controls?.[path]).toEqual([
      {
        message: `"${INTEGRATION_OVERRIDES_OUTPUT_KEY}" is not a supported property`,
        issueType: ContentIssueEnum.UNSUPPORTED_PROPERTY,
        variableName: path,
      },
    ]);
  });

  it('accepts free-form integration overrides for escape-hatch providers', () => {
    const issues = processIntegrationOverridesIssues({
      [ToolProviderIdEnum.Webhook]: {
        'prod-alerts': { event: '{{payload.event}}', nested: { any: 'value' } },
      },
    });

    expect(issues.controls).toBeUndefined();
  });

  it('rejects a provider that supports no overrides at all', () => {
    const issues = processIntegrationOverridesIssues({ 'not-a-provider': { foo: { bar: 1 } } } as never);

    expect(issues.controls?.['integrationOverrides.not-a-provider']).toEqual([
      {
        message: '"not-a-provider" is not a supported property',
        issueType: ContentIssueEnum.UNSUPPORTED_PROPERTY,
        variableName: 'integrationOverrides.not-a-provider',
      },
    ]);
  });

  it.each([null, [], 'not-an-object'])('rejects a malformed identifier map %j', (identifiers) => {
    const issues = processIntegrationOverridesIssues({ [ToolProviderIdEnum.Webhook]: identifiers } as never);

    expect(issues.controls?.[`integrationOverrides.${ToolProviderIdEnum.Webhook}`]).toBeDefined();
  });

  it('returns no issues when there are no integration overrides', () => {
    expect(processIntegrationOverridesIssues(undefined)).toEqual({});
    expect(processIntegrationOverridesIssues(null)).toEqual({});
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

  it('rejects the reserved bridge key in an escape-hatch provider override instead of dropping it silently', () => {
    const path = `providerOverrides.${ToolProviderIdEnum.Webhook}.${INTEGRATION_OVERRIDES_OUTPUT_KEY}`;
    const issues = processProviderOverridesIssues({
      [ToolProviderIdEnum.Webhook]: { event: 'x', [INTEGRATION_OVERRIDES_OUTPUT_KEY]: { spoof: {} } },
    });

    expect(issues.controls).toEqual({
      [path]: [
        {
          message: `"${INTEGRATION_OVERRIDES_OUTPUT_KEY}" is not a supported property`,
          issueType: ContentIssueEnum.UNSUPPORTED_PROPERTY,
          variableName: path,
        },
      ],
    });
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
