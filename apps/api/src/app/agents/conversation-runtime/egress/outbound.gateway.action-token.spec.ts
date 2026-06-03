import { expect } from 'chai';
import sinon from 'sinon';
import { AGENT_ACTION_TOKEN_PREFIX } from '../action-token/agent-action-token.service';
import { OutboundGateway } from './outbound.gateway';

describe('OutboundGateway action token egress', () => {
  const binding = {
    agentId: 'agent1',
    environmentId: 'env1',
    organizationId: 'org1',
    integrationIdentifier: 'telegram-main',
  };

  function makeGateway(actionTokenOverrides: {
    tokenizeCardForDelivery?: sinon.SinonStub;
  } = {}) {
    const actionTokenService = {
      tokenizeCardForDelivery:
        actionTokenOverrides.tokenizeCardForDelivery ??
        sinon.stub().callsFake(async (card: Record<string, unknown>) => ({
          ...card,
          children: [
            {
              type: 'actions',
              children: [{ type: 'button', id: `${AGENT_ACTION_TOKEN_PREFIX}tok`, label: 'Approve' }],
            },
          ],
        })),
    };
    const logger = {
      setContext: sinon.stub(),
      warn: sinon.stub(),
      error: sinon.stub(),
    };

    const gateway = new OutboundGateway(
      {} as any,
      {} as any,
      {} as any,
      { prepareContentForDelivery: sinon.stub().callsFake(async (content) => content) } as any,
      actionTokenService as any,
      logger as any
    );

    return { gateway, actionTokenService, logger };
  }

  it('tokenizes card on delivery without mutating persist payload', async () => {
    const { gateway, actionTokenService } = makeGateway();

    const card = {
      type: 'card',
      children: [
        {
          type: 'actions',
          children: [
            {
              type: 'button',
              id: 'mcp-approval:approve:sevt_long_id:550e8400-e29b-41d4-a716-446655440000',
              label: 'Approve once',
              value: 'GitHub -> get_me',
            },
          ],
        },
      ],
    };
    const deliveryContent = { card };

    const tokenized = await (gateway as any).applyActionTokensForDelivery(deliveryContent, binding);

    expect(actionTokenService.tokenizeCardForDelivery.calledOnce).to.equal(true);
    expect(deliveryContent.card.children[0].children[0].id).to.include('mcp-approval:approve');
    expect((tokenized.card as any).children[0].children[0].id.startsWith(AGENT_ACTION_TOKEN_PREFIX)).to.equal(true);
  });

  it('falls back to raw card when tokenization throws', async () => {
    const { gateway, logger } = makeGateway({
      tokenizeCardForDelivery: sinon.stub().rejects(new Error('redis down')),
    });

    const card = {
      type: 'card',
      children: [{ type: 'actions', children: [{ type: 'button', id: 'raw:action', label: 'Go' }] }],
    };
    const deliveryContent = { card };

    const result = await (gateway as any).applyActionTokensForDelivery(deliveryContent, binding);

    expect(result.card).to.deep.equal(card);
    expect(logger.warn.calledOnce).to.equal(true);
  });

  it('skips tokenization for markdown-only messages', async () => {
    const { gateway, actionTokenService } = makeGateway();

    const result = await (gateway as any).applyActionTokensForDelivery({ markdown: 'hello' }, binding);

    expect(result).to.deep.equal({ markdown: 'hello' });
    expect(actionTokenService.tokenizeCardForDelivery.called).to.equal(false);
  });
});
