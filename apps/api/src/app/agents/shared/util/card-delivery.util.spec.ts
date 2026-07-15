import { expect } from 'chai';
import type { CardElement } from 'chat';
import { deriveCardFallbackText, ensureCardDeliverable } from './card-delivery.util';

describe('card-delivery.util', () => {
  it('derives fallback text from card title and body', () => {
    const card: CardElement = {
      type: 'card',
      title: 'Pick a direction',
      children: [{ type: 'text', content: 'Here are 3 angles...' }],
    };

    expect(deriveCardFallbackText(card)).to.include('Pick a direction');
    expect(deriveCardFallbackText(card)).to.include('Here are 3 angles');
  });

  it('derives fallback text from button labels when the card has no text body', () => {
    const card: CardElement = {
      type: 'card',
      children: [
        {
          type: 'actions',
          children: [
            { type: 'button', id: 'angle-0', label: '1. Builder lesson' },
            { type: 'button', id: 'angle-1', label: '2. Founder story' },
          ],
        },
      ],
    };

    expect(deriveCardFallbackText(card)).to.equal('1. Builder lesson\n2. Founder story');
  });

  it('injects a text child when a card would otherwise have no deliverable fallback', () => {
    const card: CardElement = {
      type: 'card',
      children: [
        {
          type: 'actions',
          children: [{ type: 'button', id: 'confirm', label: 'Confirm' }],
        },
      ],
    };

    const deliverable = ensureCardDeliverable(card);

    expect(deliverable.children[0]).to.deep.equal({ type: 'text', content: 'Confirm' });
  });

  it('leaves cards with existing fallback text unchanged', () => {
    const card: CardElement = {
      type: 'card',
      title: 'Ready',
      children: [{ type: 'text', content: 'Your order is ready.' }],
    };

    expect(ensureCardDeliverable(card)).to.equal(card);
  });
});
