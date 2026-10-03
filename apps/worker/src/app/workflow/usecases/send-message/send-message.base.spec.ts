import { TriggerOverrides } from '@novu/shared';
import { expect } from 'chai';
import { combineProviderOverrides } from './send-message.base';

const PROVIDER_ID = 'slack';

type ProviderData = Record<string, unknown>;

function bridge(providerData: ProviderData) {
  return { providers: { [PROVIDER_ID]: providerData } };
}

/** `TriggerOverrides.providers` is a total record over every provider id, so one-provider literals need the cast. */
function triggerOverrides(shape: {
  providers?: Record<string, ProviderData>;
  integrations?: Record<string, ProviderData>;
  steps?: Record<string, { providers?: Record<string, ProviderData>; integrations?: Record<string, ProviderData> }>;
}): TriggerOverrides {
  return shape as unknown as TriggerOverrides;
}

function stepOverrides(providerData: ProviderData): TriggerOverrides {
  return triggerOverrides({ steps: { step_1: { providers: { [PROVIDER_ID]: providerData } } } });
}

describe('combineProviderOverrides', () => {
  it('replaces a persisted array with the step-scoped array instead of merging them by index', () => {
    const combined = combineProviderOverrides(
      bridge({ blocks: [{ type: 'section', text: 'a' }, { type: 'divider' }, { type: 'actions' }] }),
      stepOverrides({ blocks: [{ type: 'header', text: 'x' }] }),
      'step_1',
      PROVIDER_ID
    );

    expect(combined.blocks).to.deep.equal([{ type: 'header', text: 'x' }]);
  });

  it('lets an empty override array clear a persisted array', () => {
    const combined = combineProviderOverrides(
      bridge({ blocks: [{ type: 'section' }, { type: 'divider' }] }),
      stepOverrides({ blocks: [] }),
      'step_1',
      PROVIDER_ID
    );

    expect(combined.blocks).to.deep.equal([]);
  });

  it('replaces arrays nested inside objects', () => {
    const combined = combineProviderOverrides(
      bridge({ attachment: { elements: ['a', 'b', 'c'], color: 'good' } }),
      stepOverrides({ attachment: { elements: ['x'] } }),
      'step_1',
      PROVIDER_ID
    );

    expect(combined.attachment).to.deep.equal({ elements: ['x'], color: 'good' });
  });

  it('applies bridge < workflow-global < step-scoped precedence to arrays', () => {
    const combined = combineProviderOverrides(
      bridge({ blocks: ['bridge'], text: 'bridge text' }),
      triggerOverrides({
        providers: { [PROVIDER_ID]: { blocks: ['global'], text: 'global text' } },
        steps: { step_1: { providers: { [PROVIDER_ID]: { blocks: ['step'] } } } },
      }),
      'step_1',
      PROVIDER_ID
    );

    expect(combined).to.deep.equal({ blocks: ['step'], text: 'global text' });
  });

  it('ignores step-scoped overrides belonging to another step', () => {
    const combined = combineProviderOverrides(
      bridge({ blocks: ['bridge'] }),
      triggerOverrides({ steps: { step_2: { providers: { [PROVIDER_ID]: { blocks: ['other'] } } } } }),
      'step_1',
      PROVIDER_ID
    );

    expect(combined.blocks).to.deep.equal(['bridge']);
  });

  it('keeps deep-merging non-array values', () => {
    const combined = combineProviderOverrides(
      bridge({ metadata: { channel: 'general', icon: ':bell:' } }),
      stepOverrides({ metadata: { icon: ':fire:' } }),
      'step_1',
      PROVIDER_ID
    );

    expect(combined.metadata).to.deep.equal({ channel: 'general', icon: ':fire:' });
  });

  it('replaces an object with an override array and an array with an override scalar', () => {
    const combined = combineProviderOverrides(
      bridge({ blocks: { type: 'section' }, attachments: ['a', 'b'] }),
      stepOverrides({ blocks: ['x'], attachments: 'none' }),
      'step_1',
      PROVIDER_ID
    );

    expect(combined.blocks).to.deep.equal(['x']);
    expect(combined.attachments).to.equal('none');
  });

  it('treats an undefined override value as absent and a null one as an explicit clear', () => {
    const combined = combineProviderOverrides(
      bridge({ blocks: ['bridge'], attachments: ['a'] }),
      stepOverrides({ blocks: undefined, attachments: null }),
      'step_1',
      PROVIDER_ID
    );

    expect(combined.blocks).to.deep.equal(['bridge']);
    expect(combined.attachments).to.equal(null);
  });

  it('detaches the merged arrays from the command they came from', () => {
    const blocks = [{ type: 'section' }];

    const combined = combineProviderOverrides(bridge({ blocks }), undefined, 'step_1', PROVIDER_ID);

    expect(combined.blocks).to.deep.equal(blocks);
    expect(combined.blocks).to.not.equal(blocks);
    expect((combined.blocks as unknown[])[0]).to.not.equal(blocks[0]);
  });

  it('returns an empty object when the provider has no overrides at any layer', () => {
    expect(combineProviderOverrides(undefined, undefined, undefined, PROVIDER_ID)).to.deep.equal({});
    expect(combineProviderOverrides(bridge({ blocks: ['bridge'] }), undefined, undefined, 'discord')).to.deep.equal({});
  });

  it('passes Slack routing and credential keys from the persisted layer through', () => {
    const combined = combineProviderOverrides(
      bridge({ channel: 'C_ATTACKER', token: 'xoxb-stolen', as_user: true, text: 'hi' }),
      undefined,
      'step_1',
      PROVIDER_ID
    );

    expect(combined).to.deep.equal({ channel: 'C_ATTACKER', token: 'xoxb-stolen', as_user: true, text: 'hi' });
  });

  it('lets step-scoped Slack routing keys win over workflow-global ones', () => {
    const combined = combineProviderOverrides(
      bridge({ text: 'hi' }),
      triggerOverrides({
        providers: { [PROVIDER_ID]: { channel: 'C_GLOBAL' } },
        steps: { step_1: { providers: { [PROVIDER_ID]: { channel: 'C_STEP' } } } },
      }),
      'step_1',
      PROVIDER_ID
    );

    expect(combined).to.deep.equal({ text: 'hi', channel: 'C_STEP' });
  });

  it('passes routing keys persisted on the step through, for schema-less providers too', () => {
    const combined = combineProviderOverrides(
      { providers: { discord: { content: 'hi', webhookUrl: 'https://elsewhere.example/hook' } } },
      undefined,
      'step_1',
      'discord'
    );

    expect(combined).to.deep.equal({ content: 'hi', webhookUrl: 'https://elsewhere.example/hook' });
  });

  it('passes a persisted endpoint swap through while keeping ordinary object overrides', () => {
    const combined = combineProviderOverrides(
      bridge({
        text: 'hi',
        'slack-endpoint-1': { endpoint: { channelId: 'C_ATTACKER' } },
        metadata: { event_type: 'x' },
      }),
      undefined,
      'step_1',
      PROVIDER_ID
    );

    expect(combined).to.deep.equal({
      text: 'hi',
      'slack-endpoint-1': { endpoint: { channelId: 'C_ATTACKER' } },
      metadata: { event_type: 'x' },
    });
  });

  it('still lets a trigger-time caller choose the destination', () => {
    const combined = combineProviderOverrides(
      bridge({ text: 'hi' }),
      stepOverrides({ webhookUrl: 'https://chosen.example/hook' }),
      'step_1',
      PROVIDER_ID
    );

    expect(combined.webhookUrl).to.equal('https://chosen.example/hook');
  });

  it('passes reserved keys in _passthrough.body and at the top level through', () => {
    const combined = combineProviderOverrides(
      bridge({ channel: 'C_ATTACKER', _passthrough: { body: { channel: 'C_SMUGGLED', unfurl_links: false } } }),
      undefined,
      'step_1',
      PROVIDER_ID
    );

    expect(combined).to.deep.equal({
      channel: 'C_ATTACKER',
      _passthrough: { body: { channel: 'C_SMUGGLED', unfurl_links: false } },
    });
  });

  describe('integration-identifier keyed overrides', () => {
    it('lets the workflow integration layer beat the workflow-global and step-scoped provider layers', () => {
      const combined = combineProviderOverrides(
        bridge({ text: 'bridge text', channel: 'C_BRIDGE' }),
        triggerOverrides({
          providers: { [PROVIDER_ID]: { text: 'global text', icon: ':global:' } },
          integrations: { 'slack-eng': { text: 'eng text', icon: ':eng:', username: 'eng-bot' } },
          steps: { step_1: { providers: { [PROVIDER_ID]: { text: 'step text', icon: ':step:' } } } },
        }),
        'step_1',
        PROVIDER_ID,
        'slack-eng'
      );

      expect(combined).to.deep.equal({ text: 'eng text', channel: 'C_BRIDGE', icon: ':eng:', username: 'eng-bot' });
    });

    it('lets the step integration layer beat the workflow integration layer', () => {
      const combined = combineProviderOverrides(
        bridge({ text: 'bridge text' }),
        triggerOverrides({
          integrations: { 'slack-eng': { text: 'workflow eng text', icon: ':eng:' } },
          steps: { step_1: { integrations: { 'slack-eng': { text: 'step eng text' } } } },
        }),
        'step_1',
        PROVIDER_ID,
        'slack-eng'
      );

      expect(combined).to.deep.equal({ text: 'step eng text', icon: ':eng:' });
    });

    it('resolves distinct payloads for two integrations that share a providerId', () => {
      const overrides = triggerOverrides({
        providers: { [PROVIDER_ID]: { text: 'shared text' } },
        integrations: {
          'slack-eng': { channel: 'C_ENG' },
          'slack-sales': { channel: 'C_SALES', text: 'sales text' },
        },
      });

      const eng = combineProviderOverrides(undefined, overrides, 'step_1', PROVIDER_ID, 'slack-eng');
      const sales = combineProviderOverrides(undefined, overrides, 'step_1', PROVIDER_ID, 'slack-sales');

      expect(eng).to.deep.equal({ text: 'shared text', channel: 'C_ENG' });
      expect(sales).to.deep.equal({ text: 'sales text', channel: 'C_SALES' });
    });

    it('yields the provider-keyed result when the identifier is missing or not targeted', () => {
      const overrides = triggerOverrides({
        providers: { [PROVIDER_ID]: { text: 'global text' } },
        integrations: { 'slack-eng': { text: 'eng text' } },
        steps: {
          step_1: {
            providers: { [PROVIDER_ID]: { icon: ':step:' } },
            integrations: { 'slack-eng': { icon: ':eng:' } },
          },
        },
      });
      const providerKeyedOnly = { text: 'global text', icon: ':step:', channel: 'C_BRIDGE' };

      expect(combineProviderOverrides(bridge({ channel: 'C_BRIDGE' }), overrides, 'step_1', PROVIDER_ID)).to.deep.equal(
        providerKeyedOnly
      );
      expect(
        combineProviderOverrides(bridge({ channel: 'C_BRIDGE' }), overrides, 'step_1', PROVIDER_ID, 'slack-unknown')
      ).to.deep.equal(providerKeyedOnly);
    });

    it('replaces inherited arrays whole and clears inherited fields set to null', () => {
      const combined = combineProviderOverrides(
        bridge({ blocks: [{ type: 'section' }, { type: 'divider' }], attachments: ['a'] }),
        triggerOverrides({
          steps: { step_1: { integrations: { 'slack-eng': { blocks: [{ type: 'header' }], attachments: null } } } },
        }),
        'step_1',
        PROVIDER_ID,
        'slack-eng'
      );

      expect(combined).to.deep.equal({ blocks: [{ type: 'header' }], attachments: null });
    });

    it('ignores integration overrides belonging to another step', () => {
      const combined = combineProviderOverrides(
        bridge({ text: 'bridge text' }),
        triggerOverrides({ steps: { step_2: { integrations: { 'slack-eng': { text: 'other step text' } } } } }),
        'step_1',
        PROVIDER_ID,
        'slack-eng'
      );

      expect(combined).to.deep.equal({ text: 'bridge text' });
    });
  });
});
