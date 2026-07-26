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
  steps?: Record<string, { providers: Record<string, ProviderData> }>;
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
});
