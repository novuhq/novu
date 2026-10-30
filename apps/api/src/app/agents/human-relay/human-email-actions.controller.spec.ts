import { createHash } from 'node:crypto';
import { HumanInteractionKindEnum, HumanInteractionStatusEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { AgentActionPreDispatchError } from '../conversation-runtime/ingress/inbound.dispatcher';
import { AgentEmailActionCacheUnavailableError } from '../email/agent-email-action-token.service';
import { HumanEmailActionsController } from './human-email-actions.controller';

const claims = {
  agentId: 'agent-1',
  agentIdentifier: 'inbox',
  agentName: 'Atlas',
  integrationIdentifier: 'email',
  environmentId: 'env-1',
  organizationId: 'org-1',
  threadId: 'thread-1',
  messageId: '<msg@agentinbox.md>',
  actionId: 'human:hi_1:approve',
  label: 'Approve',
  userIdentifier: 'maya@acme.co',
  agentInbox: { question: 'Send a $45 refund for order #2231?' },
};
const parties = {
  sender: {
    agentName: 'Atlas',
    operatorName: 'Dima Grossman',
    pictureUrl: 'https://agentinbox.md/brand/agent-avatar.png',
  },
  recipient: { name: 'Maya Levi', firstName: 'Maya' },
};
const peeked = { claims, expiresAt: 2_000_000_000, mintedAt: Math.floor(Date.now() / 1000) - 120 };

function pendingInteraction(overrides: Record<string, unknown> = {}) {
  return {
    identifier: 'hi_1',
    kind: HumanInteractionKindEnum.APPROVE,
    status: HumanInteractionStatusEnum.PENDING,
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
    ...overrides,
  };
}

function setUp(options: { peek?: unknown; consume?: unknown; interaction?: unknown; settled?: unknown } = {}) {
  const tokenService = {
    peekActionToken: sinon.stub().resolves('peek' in options ? options.peek : peeked),
    consumeActionToken: sinon.stub().resolves('consume' in options ? options.consume : peeked),
    releaseActionToken: sinon.stub().resolves(),
  };
  const dispatcher = { processEmailAction: sinon.stub().resolves() };
  const interactions = {
    findByIdentifier: sinon.stub().resolves('interaction' in options ? options.interaction : pendingInteraction()),
    findByRequestId: sinon.stub().resolves(null),
  };
  if ('settled' in options) {
    interactions.findByIdentifier.onSecondCall().resolves(options.settled);
  }
  const relayEmail = { findParties: sinon.stub().resolves(parties) };
  const logger = { setContext: sinon.stub(), warn: sinon.stub(), error: sinon.stub() };
  const controller = new HumanEmailActionsController(
    tokenService as never,
    dispatcher as never,
    interactions as never,
    relayEmail as never,
    logger as never
  );

  const res = { status: sinon.stub(), setHeader: sinon.stub(), type: sinon.stub(), send: sinon.stub() };
  res.status.returns(res);
  res.setHeader.returns(res);
  res.type.returns(res);

  return { controller, tokenService, dispatcher, res };
}

function sentHtml(res: { send: sinon.SinonStub }): string {
  return res.send.firstCall.args[0] as string;
}

describe('HumanEmailActionsController', () => {
  describe('preview', () => {
    it('shows the question and who asked, and answers nothing', async () => {
      const { controller, dispatcher, tokenService, res } = setUp();

      await controller.preview('tok', res as never);

      const html = sentHtml(res);
      expect(html).to.include('Send a $45 refund for order #2231?');
      expect(html).to.include('Atlas asked Maya Levi 2 min ago. It’s waiting, patiently.');
      expect(html).to.include('Link scanners click everything.');
      expect(html).to.include('>Approve</button>');
      expect(dispatcher.processEmailAction.called).to.equal(false);
      expect(tokenService.consumeActionToken.called).to.equal(false);
    });

    it('lets the page’s own script run and nothing else, which the API’s default policy would block', async () => {
      const { controller, res } = setUp();

      await controller.preview('tok', res as never);

      const html = sentHtml(res);
      const script = html.slice(html.indexOf('<script>') + '<script>'.length, html.indexOf('</script>'));
      const policy = res.setHeader.withArgs('Content-Security-Policy').firstCall?.args[1] as string | undefined;
      const scriptPolicy = policy?.split(';').find((directive) => directive.startsWith('script-src '));

      expect(script).to.include('cancel-button');
      expect(scriptPolicy).to.equal(`script-src 'sha256-${createHash('sha256').update(script).digest('base64')}'`);
    });

    it('turns away a link that is gone', async () => {
      const { controller, res } = setUp({ peek: null });

      await controller.preview('tok', res as never);

      expect(sentHtml(res)).to.include('This link already did its job');
    });

    it('turns away the token of another agent, whose page is not this one', async () => {
      const { agentInbox: _agentInbox, ...otherAgent } = claims;
      const { controller, res } = setUp({ peek: { ...peeked, claims: otherAgent } });

      await controller.preview('tok', res as never);

      expect(sentHtml(res)).to.include('This link already did its job');
      expect(sentHtml(res)).to.not.include('Send a $45 refund');
    });

    it('says so when the question was answered elsewhere', async () => {
      const answered = pendingInteraction({ status: HumanInteractionStatusEnum.APPROVED });
      const { controller, res } = setUp({ interaction: answered });

      await controller.preview('tok', res as never);

      expect(sentHtml(res)).to.include('This link already did its job');
      expect(sentHtml(res)).to.include('reply to Atlas’s email');
    });

    it('says so when the question ran out of time', async () => {
      const overdue = pendingInteraction({ expiresAt: new Date(Date.now() - 1000).toISOString() });
      const { controller, res } = setUp({ interaction: overdue });

      await controller.preview('tok', res as never);

      expect(sentHtml(res)).to.include('This link already did its job');
    });

    it('asks to try again when the cache is down', async () => {
      const { controller, tokenService, res } = setUp();
      tokenService.peekActionToken.rejects(new AgentEmailActionCacheUnavailableError('peek'));

      await controller.preview('tok', res as never);

      expect(res.status.firstCall.args[0]).to.equal(503);
      expect(sentHtml(res)).to.include('Give it a moment');
    });
  });

  describe('execute', () => {
    it('sends the answer and says what happened', async () => {
      const { controller, dispatcher, res } = setUp();

      await controller.execute('tok', res as never);

      expect(dispatcher.processEmailAction.calledOnceWith(claims)).to.equal(true);
      expect(sentHtml(res)).to.include('Approved');
      expect(sentHtml(res)).to.include('Atlas is on it and will tell you when it’s done.');
    });

    it('says Denied after Deny', async () => {
      const deny = { ...peeked, claims: { ...claims, actionId: 'human:hi_1:deny', label: 'Deny' } };
      const { controller, res } = setUp({ peek: deny, consume: deny });

      await controller.execute('tok', res as never);

      expect(sentHtml(res)).to.include('Denied');
      expect(sentHtml(res)).to.include('Atlas won’t go ahead.');
    });

    it('names the pick after a choice', async () => {
      const pick = { ...peeked, claims: { ...claims, actionId: 'human:hi_1:opt:a', label: 'Tue 28 Oct · 10:00' } };
      const interaction = pendingInteraction({ kind: HumanInteractionKindEnum.CHOOSE });
      const { controller, res } = setUp({ peek: pick, consume: pick, interaction });

      await controller.execute('tok', res as never);

      expect(sentHtml(res)).to.include('Picked');
      expect(sentHtml(res)).to.include('Atlas will go with Tue 28 Oct · 10:00.');
    });

    it('says the link is used when another answer got there first', async () => {
      const deny = { ...peeked, claims: { ...claims, actionId: 'human:hi_1:deny', label: 'Deny' } };
      const settled = pendingInteraction({
        status: HumanInteractionStatusEnum.APPROVED,
        response: { type: 'option', optionId: 'approve', respondedAt: '2026-10-30T10:00:00.000Z' },
      });
      const { controller, res } = setUp({ peek: deny, consume: deny, settled });

      await controller.execute('tok', res as never);

      expect(sentHtml(res)).to.include('This link already did its job');
      expect(sentHtml(res)).to.not.include('Denied');
    });

    it('says the link is used when the question closed before the answer landed', async () => {
      const settled = pendingInteraction({ status: HumanInteractionStatusEnum.EXPIRED });
      const { controller, res } = setUp({ settled });

      await controller.execute('tok', res as never);

      expect(sentHtml(res)).to.include('This link already did its job');
    });

    it('confirms an answer that matches the one that counted', async () => {
      const settled = pendingInteraction({
        status: HumanInteractionStatusEnum.APPROVED,
        response: { type: 'option', optionId: 'approve', respondedAt: '2026-10-30T10:00:00.000Z' },
      });
      const { controller, res } = setUp({ settled });

      await controller.execute('tok', res as never);

      expect(sentHtml(res)).to.include('Approved');
    });

    it('confirms a pick between questions, which settles with its text', async () => {
      const pick = { ...peeked, claims: { ...claims, actionId: 'human:pick:hi_1:a1', label: 'The refund' } };
      const settled = pendingInteraction({
        kind: HumanInteractionKindEnum.ASK,
        status: HumanInteractionStatusEnum.ANSWERED,
        response: { type: 'text', text: 'Yes', respondedAt: '2026-10-30T10:00:00.000Z' },
      });
      const { controller, res } = setUp({ peek: pick, consume: pick, settled });

      await controller.execute('tok', res as never);

      expect(sentHtml(res)).to.not.include('This link already did its job');
    });

    it('sends nothing for a question that closed in the meantime', async () => {
      const answered = pendingInteraction({ status: HumanInteractionStatusEnum.ANSWERED });
      const { controller, dispatcher, tokenService, res } = setUp({ interaction: answered });

      await controller.execute('tok', res as never);

      expect(tokenService.consumeActionToken.called).to.equal(false);
      expect(dispatcher.processEmailAction.called).to.equal(false);
      expect(sentHtml(res)).to.include('This link already did its job');
    });

    it('sends nothing twice', async () => {
      const { controller, dispatcher, res } = setUp({ consume: null });

      await controller.execute('tok', res as never);

      expect(dispatcher.processEmailAction.called).to.equal(false);
      expect(sentHtml(res)).to.include('This link already did its job');
    });

    it('gives the link back when the answer never left', async () => {
      const { controller, dispatcher, tokenService, res } = setUp();
      dispatcher.processEmailAction.rejects(new AgentActionPreDispatchError('no config'));

      await controller.execute('tok', res as never);

      expect(tokenService.releaseActionToken.calledOnce).to.equal(true);
      expect(sentHtml(res)).to.include('That didn’t go through');
    });

    it('keeps the link used when the answer may have gone out', async () => {
      const { controller, dispatcher, tokenService, res } = setUp();
      dispatcher.processEmailAction.rejects(new Error('after dispatch'));

      await controller.execute('tok', res as never);

      expect(tokenService.releaseActionToken.called).to.equal(false);
      expect(sentHtml(res)).to.include('That didn’t go through');
    });
  });
});
