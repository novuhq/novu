import { buildAnnotatedPreviewLines, ChatProviderIdEnum, ToolProviderIdEnum } from '@novu/shared';
import { describe, expect, it } from 'vitest';
import {
  buildOverridePreviewLines,
  getInheritedOverridePaths,
  mergeOverrideLayers,
  resolveOverrideForPreview,
  resolveSourceOverrideForPreview,
} from './override-preview';

describe('resolveOverrideForPreview', () => {
  it('ignores preview-only keys so a late preview echo cannot invent an override', () => {
    expect(
      resolveOverrideForPreview({
        key: ChatProviderIdEnum.WhatsAppBusiness,
        formOverrides: undefined,
        previewOverrides: {
          [ChatProviderIdEnum.WhatsAppBusiness]: { text: { preview_url: true } },
        },
      })
    ).toEqual({ hasOverride: false, override: undefined });
  });

  it('uses form presence for hasOverride and prefers liquid-resolved preview content', () => {
    const formOverride = { text: 'from form {{payload.x}}' };
    const previewOverride = { text: 'from preview resolved' };

    expect(
      resolveOverrideForPreview({
        key: ChatProviderIdEnum.Slack,
        formOverrides: { [ChatProviderIdEnum.Slack]: formOverride },
        previewOverrides: { [ChatProviderIdEnum.Slack]: previewOverride },
      })
    ).toEqual({ hasOverride: true, override: previewOverride });
  });

  it('falls back to the form override while preview is still settling', () => {
    const formOverride = { message: 'pagerduty alert' };

    expect(
      resolveOverrideForPreview({
        key: ToolProviderIdEnum.PagerDuty,
        formOverrides: { [ToolProviderIdEnum.PagerDuty]: formOverride },
        previewOverrides: {},
      })
    ).toEqual({ hasOverride: true, override: formOverride });
  });

  it('treats an empty form entry as an override', () => {
    expect(
      resolveOverrideForPreview({
        key: ChatProviderIdEnum.Discord,
        formOverrides: { [ChatProviderIdEnum.Discord]: {} },
        previewOverrides: undefined,
      })
    ).toEqual({ hasOverride: true, override: {} });
  });

  it('keeps form content when preview echoes an empty object for the same provider', () => {
    const formOverride = { text: { preview_url: true } };

    expect(
      resolveOverrideForPreview({
        key: ChatProviderIdEnum.WhatsAppBusiness,
        formOverrides: { [ChatProviderIdEnum.WhatsAppBusiness]: formOverride },
        previewOverrides: { [ChatProviderIdEnum.WhatsAppBusiness]: {} },
      })
    ).toEqual({ hasOverride: true, override: formOverride });
  });
});

describe('mergeOverrideLayers', () => {
  it('deep-merges objects, replaces arrays whole and lets the integration layer win', () => {
    expect(
      mergeOverrideLayers(
        { channel: 'ops', text: { body: 'all', preview_url: true }, blocks: [{ type: 'divider' }, { type: 'header' }] },
        { text: { body: 'prod' }, blocks: [{ type: 'section' }], urgent: true }
      )
    ).toEqual({
      channel: 'ops',
      text: { body: 'prod', preview_url: true },
      blocks: [{ type: 'section' }],
      urgent: true,
    });
  });

  it('replaces mismatched shapes instead of merging them', () => {
    expect(mergeOverrideLayers({ a: { nested: true }, b: 'text' }, { a: 'flat', b: { nested: true } })).toEqual({
      a: 'flat',
      b: { nested: true },
    });
  });

  it('matches the send path where lodash keeps the provider value: an undefined overlay or an object over an array', () => {
    expect(
      mergeOverrideLayers(
        { blocks: [{ type: 'divider' }], text: 'all' },
        { blocks: { type: 'section' }, text: undefined }
      )
    ).toEqual({ blocks: [{ type: 'divider' }], text: 'all' });
  });

  it('keeps a "__proto__" key as plain data', () => {
    const merged = mergeOverrideLayers({}, JSON.parse('{"__proto__": {"polluted": true}}'));

    expect(Object.keys(merged)).toEqual(['__proto__']);
    expect(({} as Record<string, unknown>).polluted).toBe(undefined);
  });
});

describe('getInheritedOverridePaths', () => {
  it('lists the paths whose value comes only from the provider layer', () => {
    expect(
      getInheritedOverridePaths(
        { channel: 'ops', text: { body: 'all', preview_url: true }, blocks: [{ type: 'divider' }] },
        { text: { body: 'prod' }, blocks: [], urgent: true }
      )
    ).toEqual(['channel', 'text.preview_url']);
  });

  it('inherits every top-level key from an empty integration layer', () => {
    expect(getInheritedOverridePaths({ a: 1, b: { c: 2 } }, {})).toEqual(['a', 'b']);
  });

  it('marks provider values the merge keeps despite an overlay key as inherited', () => {
    expect(
      getInheritedOverridePaths(
        { blocks: [{ type: 'divider' }], text: 'all' },
        { blocks: { type: 'x' }, text: undefined }
      )
    ).toEqual(['blocks', 'text']);
  });
});

describe('resolveSourceOverrideForPreview', () => {
  const WEBHOOK = ToolProviderIdEnum.Webhook;
  const prod = { providerId: WEBHOOK, integrationIdentifier: 'prod' };

  it('resolves a provider source to its own override', () => {
    expect(
      resolveSourceOverrideForPreview({
        source: { providerId: WEBHOOK },
        formOverrides: {
          providerOverrides: { [WEBHOOK]: { env: 'all' } },
          integrationOverrides: { [WEBHOOK]: { prod: { env: 'prod' } } },
        },
        previewOverrides: undefined,
      })
    ).toEqual({ hasOverride: true, override: { env: 'all' }, inheritedPaths: [] });
  });

  it('merges the integration layer over the provider layer, preferring liquid-resolved preview content', () => {
    expect(
      resolveSourceOverrideForPreview({
        source: prod,
        formOverrides: {
          providerOverrides: { [WEBHOOK]: { env: '{{payload.env}}', team: 'core' } },
          integrationOverrides: { [WEBHOOK]: { prod: { env: 'prod', region: '{{payload.region}}' } } },
        },
        previewOverrides: {
          providerOverrides: { [WEBHOOK]: { env: 'resolved', team: 'core' } },
          integrationOverrides: { [WEBHOOK]: { prod: { env: 'prod', region: 'eu' } } },
        },
      })
    ).toEqual({ hasOverride: true, override: { env: 'prod', team: 'core', region: 'eu' }, inheritedPaths: ['team'] });
  });

  it('falls back to the form integration layer while preview is still settling', () => {
    expect(
      resolveSourceOverrideForPreview({
        source: prod,
        formOverrides: {
          providerOverrides: { [WEBHOOK]: { team: 'core' } },
          integrationOverrides: { [WEBHOOK]: { prod: { env: 'prod' } } },
        },
        previewOverrides: { providerOverrides: { [WEBHOOK]: { team: 'core' } } },
      })
    ).toEqual({ hasOverride: true, override: { team: 'core', env: 'prod' }, inheritedPaths: ['team'] });
  });

  it('inherits the whole provider override when the integration has none of its own', () => {
    expect(
      resolveSourceOverrideForPreview({
        source: prod,
        formOverrides: { providerOverrides: { [WEBHOOK]: { team: 'core' } } },
        previewOverrides: undefined,
      })
    ).toEqual({ hasOverride: true, override: { team: 'core' }, inheritedPaths: ['team'] });
  });

  it('reports no override when neither layer has one', () => {
    expect(resolveSourceOverrideForPreview({ source: prod, formOverrides: {}, previewOverrides: undefined })).toEqual({
      hasOverride: false,
      override: undefined,
      inheritedPaths: [],
    });
  });
});

describe('buildOverridePreviewLines', () => {
  const merged = { username: 'bot', text: { body: 'hello', preview_url: true }, blocks: [{ type: 'divider' }] };

  it('matches the shared annotated preview when nothing is inherited', () => {
    expect(buildOverridePreviewLines(merged, 'text.body', [])).toEqual(buildAnnotatedPreviewLines(merged, 'text.body'));
  });

  it('marks inherited lines beside the default content line', () => {
    expect(buildOverridePreviewLines(merged, 'text.body', ['username', 'text.preview_url'])).toEqual([
      { json: '{' },
      { json: '  "username": "bot",', isInherited: true },
      { json: '  "text": {' },
      { json: '    "body": "hello",', isDefaultContentKey: true },
      { json: '    "preview_url": true', isInherited: true },
      { json: '  },' },
      { json: '  "blocks": [' },
      { json: '    {' },
      { json: '      "type": "divider"' },
      { json: '    }' },
      { json: '  ]' },
      { json: '}' },
    ]);
  });
});
