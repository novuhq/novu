import { expect } from 'chai';
import type { CardElement } from 'chat';

import { splitForSlackSections, splitOversizedSlackText } from './slack-section-limits';

const LIMIT = 3000;
const LONG_MARKDOWN = Array.from(
  { length: 40 },
  (_, index) => `Paragraph ${index}: ${'restaurant details '.repeat(12)}`
).join('\n\n');

describe('slack-section-limits', () => {
  describe('splitForSlackSections', () => {
    it('leaves text within the section limit untouched', () => {
      expect(splitForSlackSections('short reply')).to.deep.equal(['short reply']);
    });

    it('splits a long reply on paragraph breaks without losing content', () => {
      const chunks = splitForSlackSections(LONG_MARKDOWN);

      expect(chunks.length).to.be.greaterThan(1);
      expect(chunks.every((chunk) => chunk.length <= LIMIT)).to.equal(true);
      expect(chunks.join('\n\n')).to.equal(LONG_MARKDOWN);
    });

    it('splits text that has no paragraph or line breaks to fall back on', () => {
      const unbroken = 'x'.repeat(7500);
      const chunks = splitForSlackSections(unbroken);

      expect(chunks.every((chunk) => chunk.length <= LIMIT)).to.equal(true);
      expect(chunks.join('')).to.equal(unbroken);
    });
  });

  describe('splitOversizedSlackText', () => {
    it('returns the same card when every text child fits', () => {
      const card: CardElement = { type: 'card', children: [{ type: 'text', content: 'hello' }] };

      expect(splitOversizedSlackText(card)).to.equal(card);
    });

    it('expands an oversized text child and keeps the trailing watermark', () => {
      const card: CardElement = {
        type: 'card',
        children: [
          { type: 'text', content: LONG_MARKDOWN },
          { type: 'text', content: 'Powered by <https://novu.co|Novu>', style: 'muted' },
        ],
      };

      const children = splitOversizedSlackText(card).children;
      const textChildren = children.filter((child) => child.type === 'text');

      expect(children.length).to.be.greaterThan(card.children.length);
      expect(textChildren.every((child) => child.content.length <= LIMIT)).to.equal(true);
      expect(textChildren[textChildren.length - 1]).to.deep.equal(card.children[1]);
    });
  });
});
