import { expect } from 'chai';
import { buildRelayOwnerCardName } from './relay-owner-name';

describe('relay owner name', () => {
  describe('buildRelayOwnerCardName', () => {
    it('names the operator by their first name and the initial of their last name', () => {
      expect(buildRelayOwnerCardName('Ada', 'Lovelace')).to.equal('Ada L.');
      expect(buildRelayOwnerCardName('  Mary Jane ', ' watson ')).to.equal('Mary Jane W.');
    });

    it('takes the first letter of the last name, in any alphabet', () => {
      expect(buildRelayOwnerCardName('Paweł', 'łukasiewicz')).to.equal('Paweł Ł.');
      expect(buildRelayOwnerCardName('Ada', '"Lovelace"')).to.equal('Ada L.');
    });

    it('shows the first name alone without a last name', () => {
      expect(buildRelayOwnerCardName('Ada', undefined)).to.equal('Ada');
      expect(buildRelayOwnerCardName('Ada', '  ')).to.equal('Ada');
    });

    it('names nobody without a first name, so a last name never shows whole', () => {
      expect(buildRelayOwnerCardName(undefined, 'Lovelace')).to.equal(undefined);
      expect(buildRelayOwnerCardName('  ', 'Lovelace')).to.equal(undefined);
      expect(buildRelayOwnerCardName(null, null)).to.equal(undefined);
    });
  });
});
