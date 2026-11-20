import { SECRET_MASK } from '@novu/shared';
import { expect } from 'chai';

import { decryptEnvironmentVariableValue, resolveEnvironmentVariables } from './encrypt-environment-variable';

describe('encrypt-environment-variable', () => {
  describe('resolveEnvironmentVariables', () => {
    it('masks secret variables by default', () => {
      const variables = [
        { key: 'PUBLIC_URL', value: 'https://example.com', isSecret: false },
        { key: 'API_KEY', value: 'plain-secret-value', isSecret: true },
      ];

      const resolved = resolveEnvironmentVariables(variables);

      expect(resolved.PUBLIC_URL).to.equal('https://example.com');
      expect(resolved.API_KEY).to.equal(SECRET_MASK);
    });

    it('decrypts secret variables when includeSecrets is true', () => {
      const variables = [
        { key: 'PUBLIC_URL', value: 'https://example.com', isSecret: false },
        { key: 'API_KEY', value: 'plain-secret-value', isSecret: true },
      ];

      const resolved = resolveEnvironmentVariables(variables, { includeSecrets: true });

      expect(resolved.PUBLIC_URL).to.equal('https://example.com');
      expect(resolved.API_KEY).to.equal('plain-secret-value');
    });

    it('never returns plaintext secrets when includeSecrets is omitted', () => {
      const variables = [{ key: 'API_KEY', value: 'sk_live_super_secret', isSecret: true }];

      const masked = resolveEnvironmentVariables(variables);
      const full = resolveEnvironmentVariables(variables, { includeSecrets: true });

      expect(masked.API_KEY).to.equal(SECRET_MASK);
      expect(full.API_KEY).to.equal('sk_live_super_secret');
      expect(JSON.stringify(masked)).to.not.include('sk_live_super_secret');
    });
  });

  describe('decryptEnvironmentVariableValue', () => {
    it('returns plaintext values unchanged', () => {
      expect(decryptEnvironmentVariableValue('hello')).to.equal('hello');
    });
  });
});
