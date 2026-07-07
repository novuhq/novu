import { SECRET_MASK } from '@novu/shared';
import { expect } from 'chai';

import {
  decryptEnvironmentVariableValue,
  resolveEnvironmentVariables,
  resolveEnvironmentVariablesForPreview,
} from './encrypt-environment-variable';

describe('encrypt-environment-variable', () => {
  describe('resolveEnvironmentVariablesForPreview', () => {
    it('masks secret variables instead of decrypting them', () => {
      const variables = [
        { key: 'PUBLIC_URL', value: 'https://example.com', isSecret: false },
        { key: 'API_KEY', value: 'nvsk.encrypted-value', isSecret: true },
      ];

      const resolved = resolveEnvironmentVariablesForPreview(variables);

      expect(resolved.PUBLIC_URL).to.equal('https://example.com');
      expect(resolved.API_KEY).to.equal(SECRET_MASK);
    });

    it('does not expose decrypted secret values that resolveEnvironmentVariables would return', () => {
      const variables = [{ key: 'API_KEY', value: 'plain-secret', isSecret: true }];

      const previewResolved = resolveEnvironmentVariablesForPreview(variables);
      const fullResolved = resolveEnvironmentVariables(variables);

      expect(previewResolved.API_KEY).to.equal(SECRET_MASK);
      expect(fullResolved.API_KEY).to.equal('plain-secret');
    });
  });

  describe('decryptEnvironmentVariableValue', () => {
    it('returns plaintext values unchanged', () => {
      expect(decryptEnvironmentVariableValue('hello')).to.equal('hello');
    });
  });
});
