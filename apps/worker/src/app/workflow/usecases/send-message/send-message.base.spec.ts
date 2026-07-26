import { ChannelTypeEnum, TriggerOverrides } from '@novu/shared';
import { expect } from 'chai';
import { SendMessageBase } from './send-message.base';
import { SendMessageResult, SendMessageStatus } from './send-message-type.usecase';

class TestSendMessage extends SendMessageBase {
  channelType = ChannelTypeEnum.CHAT;

  constructor() {
    super({} as never, {} as never, {} as never, {} as never, {} as never, {} as never, {} as never);
  }

  public async execute(): Promise<SendMessageResult> {
    return { status: SendMessageStatus.SUCCESS };
  }

  public combine(
    bridgeData: Record<string, unknown> | null | undefined,
    overrides: TriggerOverrides | undefined,
    stepId: string | undefined,
    integrationId: string
  ): Record<string, unknown> {
    return this.combineOverrides(bridgeData, overrides, stepId, integrationId);
  }
}

const PROVIDER_ID = 'slack';

function bridge(providerData: Record<string, unknown>) {
  return { providers: { [PROVIDER_ID]: providerData } };
}

function stepOverrides(providerData: Record<string, unknown>): TriggerOverrides {
  return { steps: { step_1: { providers: { [PROVIDER_ID]: providerData } } } } as TriggerOverrides;
}

describe('SendMessageBase - combineOverrides', () => {
  let usecase: TestSendMessage;

  beforeEach(() => {
    usecase = new TestSendMessage();
  });

  it('replaces a persisted array with the step-scoped array instead of merging them by index', () => {
    const combined = usecase.combine(
      bridge({ blocks: [{ type: 'section', text: 'a' }, { type: 'divider' }, { type: 'actions' }] }),
      stepOverrides({ blocks: [{ type: 'header', text: 'x' }] }),
      'step_1',
      PROVIDER_ID
    );

    expect(combined.blocks).to.deep.equal([{ type: 'header', text: 'x' }]);
  });

  it('lets an empty override array clear a persisted array', () => {
    const combined = usecase.combine(
      bridge({ blocks: [{ type: 'section' }, { type: 'divider' }] }),
      stepOverrides({ blocks: [] }),
      'step_1',
      PROVIDER_ID
    );

    expect(combined.blocks).to.deep.equal([]);
  });

  it('replaces arrays nested inside objects', () => {
    const combined = usecase.combine(
      bridge({ attachment: { elements: ['a', 'b', 'c'], color: 'good' } }),
      stepOverrides({ attachment: { elements: ['x'] } }),
      'step_1',
      PROVIDER_ID
    );

    expect(combined.attachment).to.deep.equal({ elements: ['x'], color: 'good' });
  });

  it('applies bridge < workflow-global < step-scoped precedence to arrays', () => {
    const combined = usecase.combine(
      bridge({ blocks: ['bridge'], text: 'bridge text' }),
      {
        providers: { [PROVIDER_ID]: { blocks: ['global'], text: 'global text' } },
        steps: { step_1: { providers: { [PROVIDER_ID]: { blocks: ['step'] } } } },
      } as TriggerOverrides,
      'step_1',
      PROVIDER_ID
    );

    expect(combined).to.deep.equal({ blocks: ['step'], text: 'global text' });
  });

  it('ignores step-scoped overrides belonging to another step', () => {
    const combined = usecase.combine(
      bridge({ blocks: ['bridge'] }),
      { steps: { step_2: { providers: { [PROVIDER_ID]: { blocks: ['other'] } } } } } as TriggerOverrides,
      'step_1',
      PROVIDER_ID
    );

    expect(combined.blocks).to.deep.equal(['bridge']);
  });

  it('keeps deep-merging non-array values', () => {
    const combined = usecase.combine(
      bridge({ metadata: { channel: 'general', icon: ':bell:' } }),
      stepOverrides({ metadata: { icon: ':fire:' } }),
      'step_1',
      PROVIDER_ID
    );

    expect(combined.metadata).to.deep.equal({ channel: 'general', icon: ':fire:' });
  });

  it('replaces an object with an override array and an array with an override scalar', () => {
    const combined = usecase.combine(
      bridge({ blocks: { type: 'section' }, attachments: ['a', 'b'] }),
      stepOverrides({ blocks: ['x'], attachments: 'none' }),
      'step_1',
      PROVIDER_ID
    );

    expect(combined.blocks).to.deep.equal(['x']);
    expect(combined.attachments).to.equal('none');
  });

  it('treats an undefined override value as absent and a null one as an explicit clear', () => {
    const combined = usecase.combine(
      bridge({ blocks: ['bridge'], attachments: ['a'] }),
      stepOverrides({ blocks: undefined, attachments: null }),
      'step_1',
      PROVIDER_ID
    );

    expect(combined.blocks).to.deep.equal(['bridge']);
    expect(combined.attachments).to.equal(null);
  });

  it('returns an empty object when the provider has no overrides at any layer', () => {
    expect(usecase.combine(undefined, undefined, undefined, PROVIDER_ID)).to.deep.equal({});
    expect(usecase.combine(bridge({ blocks: ['bridge'] }), undefined, undefined, 'discord')).to.deep.equal({});
  });
});
