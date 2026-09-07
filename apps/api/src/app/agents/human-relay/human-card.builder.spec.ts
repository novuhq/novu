import type { HumanInteractionEntity } from '@novu/dal';
import { HumanInteractionKindEnum, HumanInteractionStatusEnum } from '@novu/shared';
import { expect } from 'chai';
import type { CardElement } from 'chat';
import { buildPendingContent, buildResolvedContent } from './human-card.builder';

const SLACK_HEADER_MAX = 150;

function interaction(overrides: Partial<HumanInteractionEntity>): HumanInteractionEntity {
  return {
    _id: 'id1',
    identifier: 'hi_1',
    kind: HumanInteractionKindEnum.APPROVE,
    status: HumanInteractionStatusEnum.PENDING,
    prompt: 'Deploy?',
    subscriberIds: ['sub-1'],
    _agentId: 'agent1',
    expiresAt: new Date().toISOString(),
    _environmentId: 'env1',
    _organizationId: 'org1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
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
    const card = requireCard(buildPendingContent(interaction({ prompt: 'Deploy v2?' })).card);

    expect(card.title).to.equal('Deploy v2?');
    expect(card.subtitle).to.equal(undefined);
    expect(card.children[0]).to.include({ type: 'actions' });
  });

  it('puts remaining prompt lines in the body', () => {
    const card = requireCard(
      buildPendingContent(interaction({ prompt: 'Deploy v2?\nThis restarts production.\nETA 5 min' })).card
    );

    expect(card.title).to.equal('Deploy v2?');
    expect(bodyContent(card)).to.equal('This restarts production.\nETA 5 min');
    expect(card.children[1]).to.include({ type: 'actions' });
  });

  it('fills subtitle from title overflow when there is no attribution', () => {
    const prompt = 'A'.repeat(200);
    const card = requireCard(buildPendingContent(interaction({ prompt })).card);

    expect(card.title?.length).to.equal(SLACK_HEADER_MAX);
    expect(card.title?.endsWith('…')).to.equal(true);
    expect(card.subtitle?.length).to.equal(prompt.length - (SLACK_HEADER_MAX - 1));
    expect(card.subtitle).to.equal(prompt.slice(SLACK_HEADER_MAX - 1));
    expect(card.children[0]).to.include({ type: 'actions' });
  });

  it('sends subtitle overflow to the body', () => {
    const prompt = 'B'.repeat(400);
    const card = requireCard(buildPendingContent(interaction({ prompt })).card);

    expect(card.title?.length).to.equal(SLACK_HEADER_MAX);
    expect(card.subtitle?.length).to.equal(SLACK_HEADER_MAX);
    expect(card.subtitle?.endsWith('…')).to.equal(true);
    expect(bodyContent(card)).to.equal(prompt.slice(SLACK_HEADER_MAX - 1).slice(SLACK_HEADER_MAX - 1));
  });

  it('keeps attribution as subtitle and sends title overflow to the body', () => {
    const prompt = 'C'.repeat(200);
    const card = requireCard(buildPendingContent(interaction({ prompt, fromLabel: 'ship-bot' })).card);

    expect(card.title?.length).to.equal(SLACK_HEADER_MAX);
    expect(card.subtitle).to.equal('Requested by ship-bot');
    expect(bodyContent(card)).to.equal(prompt.slice(SLACK_HEADER_MAX - 1));
  });

  it('counts the ask prefix toward the title budget', () => {
    const prompt = 'D'.repeat(160);
    const card = requireCard(buildPendingContent(interaction({ kind: HumanInteractionKindEnum.ASK, prompt })).card);

    expect(card.title?.length).to.equal(SLACK_HEADER_MAX);
    expect(card.title?.startsWith('❓ ')).to.equal(true);
    expect(card.subtitle).to.be.a('string');
  });

  it('layouts a long resolved-card prompt the same way', () => {
    const prompt = `Ship it\n${'E'.repeat(200)}`;
    const card = requireCard(
      buildResolvedContent(
        interaction({
          prompt,
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
});
