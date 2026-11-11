import { HumanInteractionKindEnum, HumanInteractionStatusEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { editDeliveredHumanCards } from './edit-delivered-card';
import { buildOutcomeReply } from './human-card.builder';

const WHATSAPP_DELIVERY = {
  subscriberId: 'ada',
  integrationIdentifier: 'whatsapp-main',
  platform: 'whatsapp',
  platformMessageId: 'wamid.question',
  platformThreadId: 'whatsapp:1234:15551234567',
};
const TELEGRAM_DELIVERY = {
  subscriberId: 'ada',
  integrationIdentifier: 'telegram-main',
  platform: 'telegram',
  platformMessageId: '42:7',
  platformThreadId: 'telegram:42',
};

function interaction(overrides: Record<string, unknown> = {}) {
  return {
    _id: 'hi1',
    _agentId: 'agent-relay',
    identifier: 'hi_1',
    kind: HumanInteractionKindEnum.APPROVE,
    status: HumanInteractionStatusEnum.APPROVED,
    content: { cardChrome: { title: 'Deploy?' } },
    response: { optionId: 'approve', respondedBy: 'Ada' },
    deliveries: [WHATSAPP_DELIVERY, TELEGRAM_DELIVERY],
    ...overrides,
  };
}

describe('editDeliveredHumanCards', () => {
  function setup() {
    const outboundGateway = {
      editInConversation: sinon.stub().resolves(),
      sendDirectMessage: sinon.stub().resolves({ messageId: 'wamid.outcome', platformThreadId: 'whatsapp:1234:1' }),
    };
    const logger = { warn: sinon.stub() };

    return { outboundGateway, logger };
  }

  it('tells the person on WhatsApp the outcome in a reply, and edits the card elsewhere', async () => {
    const { outboundGateway, logger } = setup();

    await editDeliveredHumanCards(
      outboundGateway as never,
      logger as never,
      interaction() as never,
      {
        markdown: 'resolved',
      } as never
    );

    expect(outboundGateway.sendDirectMessage.firstCall.args).to.deep.equal([
      'agent-relay',
      'whatsapp-main',
      '15551234567',
      { markdown: '✅ Approved — passed along.' },
    ]);
    expect(outboundGateway.editInConversation.calledOnce).to.equal(true);
    expect(outboundGateway.editInConversation.firstCall.args[2]).to.equal('telegram');
  });

  it('says nothing on WhatsApp for what the person didn’t answer themselves', async () => {
    const { outboundGateway, logger } = setup();

    for (const status of [HumanInteractionStatusEnum.EXPIRED, HumanInteractionStatusEnum.CANCELED]) {
      await editDeliveredHumanCards(
        outboundGateway as never,
        logger as never,
        interaction({ status, deliveries: [WHATSAPP_DELIVERY] }) as never,
        { markdown: 'resolved' } as never
      );
    }

    expect(outboundGateway.sendDirectMessage.called).to.equal(false);
  });

  it('never undoes a settlement when the reply fails', async () => {
    const { outboundGateway, logger } = setup();
    outboundGateway.sendDirectMessage.rejects(new Error('window shut'));

    await editDeliveredHumanCards(
      outboundGateway as never,
      logger as never,
      interaction() as never,
      {
        markdown: 'resolved',
      } as never
    );

    expect(logger.warn.calledOnce).to.equal(true);
    expect(outboundGateway.editInConversation.calledOnce).to.equal(true);
  });
});

describe('buildOutcomeReply', () => {
  it('words each answer to a card', () => {
    expect(buildOutcomeReply(interaction() as never)).to.equal('✅ Approved — passed along.');
    expect(buildOutcomeReply(interaction({ status: HumanInteractionStatusEnum.DENIED }) as never)).to.equal(
      '⛔ Denied — passed along.'
    );
    expect(
      buildOutcomeReply(
        interaction({
          content: { cardChrome: { title: 'Deploy?', extraActions: [{ id: 'later', label: 'Later' }] } },
          response: { optionId: 'later' },
        }) as never
      )
    ).to.equal('✅ Later — passed along.');
    expect(
      buildOutcomeReply(
        interaction({
          kind: HumanInteractionKindEnum.CHOOSE,
          status: HumanInteractionStatusEnum.ANSWERED,
          content: { cardChrome: { title: 'Where?', options: [{ id: 'stg', label: 'staging' }, 'prod'] } },
          response: { optionId: 'stg' },
        }) as never
      )
    ).to.equal('✅ Picked staging — passed along.');
  });

  it('leaves an ask to the reply its text answer already gets', () => {
    expect(
      buildOutcomeReply(
        interaction({ kind: HumanInteractionKindEnum.ASK, status: HumanInteractionStatusEnum.ANSWERED }) as never
      )
    ).to.equal(null);
  });
});
