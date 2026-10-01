import type { HumanInteractionEntity } from '@novu/dal';
import { HumanInteractionKindEnum, HumanInteractionStatusEnum } from '@novu/shared';
import { expect } from 'chai';
import type { CardElement } from 'chat';
import { buildPendingContent, buildResolvedContent } from './human-card.builder';

const SLACK_HEADER_MAX = 150;

function interaction(
  overrides: Partial<HumanInteractionEntity> & {
    card?: { title?: string; icon?: string; extraActions?: Array<{ id: string; label: string }> };
  }
): HumanInteractionEntity {
  const { card, content, ...rest } = overrides;

  return {
    _id: 'id1',
    identifier: 'hi_1',
    kind: HumanInteractionKindEnum.APPROVE,
    status: HumanInteractionStatusEnum.PENDING,
    content: content ?? { cardChrome: { title: 'Deploy?', ...card } },
    subscriberIds: ['sub-1'],
    _agentId: 'agent1',
    expiresAt: new Date().toISOString(),
    _environmentId: 'env1',
    _organizationId: 'org1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...rest,
  };
}

function requireCard(card: CardElement | undefined): CardElement {
  expect(card, 'card should be present').to.exist;

  return card as CardElement;
}

function bodyContent(card: CardElement): string {
  const first = card.children[0];
  expect(first).to.include({ type: 'text' });

  return (first as { content: string }).content.replace(/^\n/, '');
}

describe('human-card.builder prompt layout', () => {
  it('uses a short first line as the title', () => {
    const card = requireCard(buildPendingContent(interaction({ card: { title: 'Deploy v2?' } })).card);

    expect(card.title).to.equal('Deploy v2?');
    expect(card.subtitle).to.equal(undefined);
    expect(card.children[0]).to.include({ type: 'actions' });
  });

  it('puts remaining prompt lines in the body', () => {
    const card = requireCard(
      buildPendingContent(interaction({ card: { title: 'Deploy v2?\nThis restarts production.\nETA 5 min' } })).card
    );

    expect(card.title).to.equal('Deploy v2?');
    expect(bodyContent(card)).to.equal('This restarts production.\nETA 5 min');
    expect(card.children[1]).to.include({ type: 'actions' });
  });

  it('fills subtitle from title overflow when there is no attribution', () => {
    const prompt = 'A'.repeat(200);
    const card = requireCard(buildPendingContent(interaction({ card: { title: prompt } })).card);

    expect(card.title?.length).to.equal(SLACK_HEADER_MAX);
    expect(card.title?.endsWith('…')).to.equal(true);
    expect(card.subtitle?.length).to.equal(prompt.length - (SLACK_HEADER_MAX - 1));
    expect(card.subtitle).to.equal(prompt.slice(SLACK_HEADER_MAX - 1));
    expect(card.children[0]).to.include({ type: 'actions' });
  });

  it('sends subtitle overflow to the body', () => {
    const prompt = 'B'.repeat(400);
    const card = requireCard(buildPendingContent(interaction({ card: { title: prompt } })).card);

    expect(card.title?.length).to.equal(SLACK_HEADER_MAX);
    expect(card.subtitle?.length).to.equal(SLACK_HEADER_MAX);
    expect(card.subtitle?.endsWith('…')).to.equal(true);
    expect(bodyContent(card)).to.equal(prompt.slice(SLACK_HEADER_MAX - 1).slice(SLACK_HEADER_MAX - 1));
  });

  it('keeps attribution as subtitle and sends title overflow to the body', () => {
    const prompt = 'C'.repeat(200);
    const card = requireCard(buildPendingContent(interaction({ card: { title: prompt }, fromLabel: 'ship-bot' })).card);

    expect(card.title?.length).to.equal(SLACK_HEADER_MAX);
    expect(card.subtitle).to.equal('Requested by ship-bot');
    expect(bodyContent(card)).to.equal(prompt.slice(SLACK_HEADER_MAX - 1));
  });

  it('counts the ask prefix toward the title budget', () => {
    const prompt = 'D'.repeat(160);
    const card = requireCard(
      buildPendingContent(interaction({ kind: HumanInteractionKindEnum.ASK, card: { title: prompt } })).card
    );

    expect(card.title?.length).to.equal(SLACK_HEADER_MAX);
    expect(card.title?.startsWith('❓ ')).to.equal(true);
    expect(card.subtitle).to.be.a('string');
  });

  it('layouts a long resolved-card prompt the same way', () => {
    const prompt = `Ship it\n${'E'.repeat(200)}`;
    const card = requireCard(
      buildResolvedContent(
        interaction({
          card: { title: prompt },
          status: HumanInteractionStatusEnum.APPROVED,
          response: {
            type: 'option',
            optionId: 'approve',
            respondedBy: 'alice',
            respondedAt: new Date().toISOString(),
          },
        })
      ).card
    );

    expect(card.title).to.equal('Ship it');
    expect(bodyContent(card).startsWith('E')).to.equal(true);
  });

  it('renders extra approve buttons with human:* option ids on the generic HITL card', () => {
    const card = requireCard(
      buildPendingContent(
        interaction({
          card: {
            title: 'Refund $25?',
            icon: 'stripe',
            extraActions: [{ id: 'escalate', label: 'Escalate' }],
          },
        })
      ).card
    );

    const buttons = card.children
      .filter((child) => child.type === 'actions')
      .flatMap((child) => (child as { children: Array<{ id: string; label: string }> }).children);
    expect(buttons.map((button) => button.id)).to.deep.equal([
      'human:hi_1:deny',
      'human:hi_1:approve',
      'human:hi_1:opt:escalate',
    ]);
    expect(buttons.some((button) => button.label === 'Escalate')).to.equal(true);
    expect(card.children.some((child) => child.type === 'actions')).to.equal(true);
  });

  it('mints human:* ids from actionIdentifier when renderApprove chrome is delivered', () => {
    const card = requireCard(
      buildPendingContent(interaction({ requestId: 'hr_1', card: { title: 'Refund $25?' } }), {
        actionIdentifier: 'hr_1',
      }).card
    );

    const buttons = card.children
      .filter((child) => child.type === 'actions')
      .flatMap((child) => (child as { children: Array<{ id: string }> }).children);
    expect(buttons.map((button) => button.id)).to.deep.equal(['human:hr_1:deny', 'human:hr_1:approve']);
  });

  it('shows the extra action label on a resolved approve card', () => {
    const card = requireCard(
      buildResolvedContent(
        interaction({
          card: {
            title: 'Tool approval required',
            extraActions: [{ id: 'trust-tool', label: 'Always allow this tool' }],
          },
          status: HumanInteractionStatusEnum.APPROVED,
          response: {
            type: 'option',
            optionId: 'trust-tool',
            respondedBy: 'Ada',
            respondedAt: new Date().toISOString(),
          },
        })
      ).card
    );

    expect(bodyContent(card)).to.include('Always allow this tool');
  });

  it('preserves a posted card element on settle, stripping actions and appending the status line', () => {
    const card = requireCard(
      buildResolvedContent(
        interaction({
          content: {
            card: {
              type: 'card',
              title: 'Deploy pipeline',
              subtitle: 'prod',
              children: [
                { type: 'text', content: 'Rolling out v2.4.1 to 3 regions.' },
                { type: 'divider' },
                {
                  type: 'actions',
                  children: [{ type: 'button', id: 'human:hi_1:approve', label: 'Approve', style: 'primary' }],
                },
              ],
            },
          } as HumanInteractionEntity['content'],
          status: HumanInteractionStatusEnum.APPROVED,
          response: {
            type: 'option',
            optionId: 'approve',
            respondedBy: 'alice',
            respondedAt: new Date().toISOString(),
          },
        })
      ).card
    );

    expect(card.title).to.equal('Deploy pipeline');
    expect(card.subtitle).to.equal('prod');
    expect(card.children.some((child) => child.type === 'actions')).to.equal(false);
    expect(card.children[0]).to.include({ type: 'text', content: 'Rolling out v2.4.1 to 3 regions.' });
    expect(card.children[1]).to.include({ type: 'divider' });

    const last = card.children[card.children.length - 1] as { type: string; content: string };
    expect(last.type).to.equal('text');
    expect(last.content).to.include('✅');
    expect(last.content).to.include('Approved');
    expect(last.content).to.include('alice');
  });

  it('keeps the chrome body on settle, dropping only the action controls', () => {
    const card = requireCard(
      buildResolvedContent(
        interaction({
          content: {
            cardChrome: { title: 'Deploy v2.4.1 to production?', body: 'Rolling out to 3 regions. ETA 5 min.' },
          } as HumanInteractionEntity['content'],
          status: HumanInteractionStatusEnum.APPROVED,
          response: {
            type: 'option',
            optionId: 'approve',
            respondedBy: 'alice',
            respondedAt: new Date().toISOString(),
          },
        })
      ).card
    );

    expect(card.title).to.equal('Deploy v2.4.1 to production?');
    expect(card.children.some((child) => child.type === 'actions')).to.equal(false);
    expect(bodyContent(card)).to.equal('Rolling out to 3 regions. ETA 5 min.');

    const last = card.children[card.children.length - 1] as { type: string; content: string };
    expect(last.type).to.equal('text');
    expect(last.content).to.include('✅');
    expect(last.content).to.include('Approved');
    expect(last.content).to.include('alice');
  });
});
