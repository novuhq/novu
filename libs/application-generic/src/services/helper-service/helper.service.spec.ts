import { expect } from 'chai';
import { toSentenceCase } from './helper.service';

describe('Helper Service', () => {
  describe('toSentenceCase', () => {
    it('should return an empty string if the input is empty', () => {
      expect(toSentenceCase('')).to.equal('');
    });

    it('should capitalize the first letter of the first word', () => {
      expect(toSentenceCase('hello world')).to.equal('Hello world');
    });

    it('should format camel cased text to sentence case', () => {
      expect(toSentenceCase('primaryAction')).to.equal('Primary action');
    });
  });
});
