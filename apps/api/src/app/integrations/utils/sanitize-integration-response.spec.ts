import { expect } from 'chai';

import { stripSensitiveConfigurations } from './sanitize-integration-response';

describe('sanitize-integration-response', () => {
  describe('stripSensitiveConfigurations', () => {
    it('removes inbound webhook signing keys from configurations', () => {
      const configurations = {
        inboundWebhookEnabled: 'true',
        inboundWebhookSigningKey: 'super-secret-signing-key',
      };

      const sanitized = stripSensitiveConfigurations(configurations);

      expect(sanitized).to.deep.equal({
        inboundWebhookEnabled: 'true',
      });
    });

    it('returns undefined when configurations are undefined', () => {
      expect(stripSensitiveConfigurations(undefined)).to.be.undefined;
    });
  });
});
