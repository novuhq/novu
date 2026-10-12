import {
  ChatProviderIdEnum,
  ContentIssueEnum,
  INTEGRATION_OVERRIDES_OUTPUT_KEY,
  ToolProviderIdEnum,
} from '@novu/shared';
import { describe, expect, it } from 'vitest';
import {
  buildOverrideIssueIndex,
  getOverrideIssueOwnerPath,
  getUnsupportedOverrideKeys,
  isTopLevelOverrideIssuePath,
  shouldKeepServerOverrideIssue,
} from './override-issues';
import {
  INTEGRATION_OVERRIDES_FIELD,
  integrationSource,
  PROVIDER_OVERRIDES_FIELD,
  providerSource,
} from './override-source';

const WEBHOOK = ToolProviderIdEnum.Webhook;

describe('getUnsupportedOverrideKeys', () => {
  it('allows arbitrary webhook keys while preserving strict provider schemas', () => {
    expect(getUnsupportedOverrideKeys(ToolProviderIdEnum.Webhook, { custom: true })).toEqual([]);
    expect(getUnsupportedOverrideKeys(ToolProviderIdEnum.Webhook, { [INTEGRATION_OVERRIDES_OUTPUT_KEY]: {} })).toEqual([
      INTEGRATION_OVERRIDES_OUTPUT_KEY,
    ]);
    expect(getUnsupportedOverrideKeys(ToolProviderIdEnum.PagerDuty, { custom: true })).toEqual(['custom']);
    expect(getUnsupportedOverrideKeys(ToolProviderIdEnum.Opsgenie, { custom: true })).toEqual(['custom']);
  });

  it('checks top-level keys for providers whose schema is loaded lazily', () => {
    expect(getUnsupportedOverrideKeys(ChatProviderIdEnum.Slack, { blocks: [], custom: true })).toEqual(['custom']);
  });
});

describe('isTopLevelOverrideIssuePath', () => {
  const prefix = `${PROVIDER_OVERRIDES_FIELD}.${ChatProviderIdEnum.WhatsAppBusiness}`;

  it('matches only a single segment under the provider path', () => {
    expect(isTopLevelOverrideIssuePath(`${prefix}.custom`, prefix)).toBe(true);
    expect(isTopLevelOverrideIssuePath(`${prefix}.document.link`, prefix)).toBe(false);
    expect(isTopLevelOverrideIssuePath(`${prefix}.document.id`, prefix)).toBe(false);
    expect(isTopLevelOverrideIssuePath(prefix, prefix)).toBe(false);
    expect(isTopLevelOverrideIssuePath(`${PROVIDER_OVERRIDES_FIELD}.slack.custom`, prefix)).toBe(false);
  });
});

describe('shouldKeepServerOverrideIssue', () => {
  const prefix = `${PROVIDER_OVERRIDES_FIELD}.${ChatProviderIdEnum.WhatsAppBusiness}`;

  it('drops mirrored top-level unsupported keys and keeps nested ones', () => {
    expect(
      shouldKeepServerOverrideIssue(
        { issueType: ContentIssueEnum.UNSUPPORTED_PROPERTY, variableName: `${prefix}.custom` },
        prefix,
        prefix
      )
    ).toBe(false);
    expect(
      shouldKeepServerOverrideIssue(
        { issueType: ContentIssueEnum.UNSUPPORTED_PROPERTY, variableName: `${prefix}.document.link` },
        `${prefix}.document.link`,
        prefix
      )
    ).toBe(true);
    expect(
      shouldKeepServerOverrideIssue(
        { issueType: ContentIssueEnum.MISSING_VALUE, variableName: `${prefix}.document.id` },
        `${prefix}.document.id`,
        prefix
      )
    ).toBe(true);
  });
});

describe('getOverrideIssueOwnerPath', () => {
  it('attributes a server issue to the override that owns its path', () => {
    const integrationPaths = [
      `${INTEGRATION_OVERRIDES_FIELD}.tool-webhook.prod`,
      `${INTEGRATION_OVERRIDES_FIELD}.tool-webhook.prod.eu`,
    ];

    expect(getOverrideIssueOwnerPath(`${PROVIDER_OVERRIDES_FIELD}.slack.blocks.0.text`, integrationPaths)).toBe(
      `${PROVIDER_OVERRIDES_FIELD}.slack`
    );
    expect(getOverrideIssueOwnerPath(`${INTEGRATION_OVERRIDES_FIELD}.tool-webhook.prod.title`, integrationPaths)).toBe(
      `${INTEGRATION_OVERRIDES_FIELD}.tool-webhook.prod`
    );
    expect(
      getOverrideIssueOwnerPath(`${INTEGRATION_OVERRIDES_FIELD}.tool-webhook.prod.eu.title`, integrationPaths)
    ).toBe(`${INTEGRATION_OVERRIDES_FIELD}.tool-webhook.prod.eu`);
    expect(getOverrideIssueOwnerPath(`${INTEGRATION_OVERRIDES_FIELD}.tool-webhook.other.title`, integrationPaths)).toBe(
      undefined
    );
    expect(getOverrideIssueOwnerPath('body', integrationPaths)).toBe(undefined);
  });
});

describe('buildOverrideIssueIndex', () => {
  const prodPath = `${INTEGRATION_OVERRIDES_FIELD}.${WEBHOOK}.prod`;
  const prodEuPath = `${INTEGRATION_OVERRIDES_FIELD}.${WEBHOOK}.prod.eu`;
  const pagerDutyPath = `${PROVIDER_OVERRIDES_FIELD}.${ToolProviderIdEnum.PagerDuty}`;

  it('gives an issue only to its most specific owner, even when another identifier is a dotted prefix of it', () => {
    const index = buildOverrideIssueIndex(
      {
        [`${prodPath}.title`]: [{ issueType: ContentIssueEnum.MISSING_VALUE, message: 'prod title' }],
        [`${prodEuPath}.title`]: [{ issueType: ContentIssueEnum.MISSING_VALUE, message: 'prod.eu title' }],
      },
      [
        { source: integrationSource(WEBHOOK, 'prod'), override: {} },
        { source: integrationSource(WEBHOOK, 'prod.eu'), override: {} },
      ]
    );

    expect(index.get(prodPath)?.serverIssues.map((issue) => issue.message)).toEqual(['prod title']);
    expect(index.get(prodEuPath)?.serverIssues.map((issue) => issue.message)).toEqual(['prod.eu title']);
  });

  it('flags the reserved key on a free-form webhook and drops the mirrored server issue', () => {
    const webhookPath = `${PROVIDER_OVERRIDES_FIELD}.${WEBHOOK}`;
    const reservedPath = `${webhookPath}.${INTEGRATION_OVERRIDES_OUTPUT_KEY}`;
    const index = buildOverrideIssueIndex(
      {
        [reservedPath]: [
          {
            issueType: ContentIssueEnum.UNSUPPORTED_PROPERTY,
            variableName: reservedPath,
            message: 'reserved',
          },
        ],
      },
      [{ source: providerSource(WEBHOOK), override: { [INTEGRATION_OVERRIDES_OUTPUT_KEY]: {} } }]
    );

    expect(index.get(webhookPath)).toEqual({
      serverIssues: [],
      unsupportedKeys: [INTEGRATION_OVERRIDES_OUTPUT_KEY],
    });
  });

  it('reports unsupported keys from the form and leaves out the server issues that mirror them', () => {
    const index = buildOverrideIssueIndex(
      {
        [`${pagerDutyPath}.custom`]: [
          { issueType: ContentIssueEnum.UNSUPPORTED_PROPERTY, variableName: `${pagerDutyPath}.custom`, message: 'x' },
        ],
        body: [{ issueType: ContentIssueEnum.MISSING_VALUE, message: 'not an override issue' }],
      },
      [{ source: providerSource(ToolProviderIdEnum.PagerDuty), override: { custom: true } }]
    );

    expect([...index.keys()]).toEqual([pagerDutyPath]);
    expect(index.get(pagerDutyPath)).toEqual({ serverIssues: [], unsupportedKeys: ['custom'] });
  });
});
