import {
  decryptCredentials,
  decryptProviderSecret,
  encryptCredentials,
  encryptProviderSecret,
} from './encrypt-provider';
// eslint-disable-next-line no-restricted-imports
import { ICredentialsDto } from '@novu/shared/src';

describe('Encrypt provider secrets', function () {
  const novuSubMask = 'nvsk.';

  it('should encrypt provider secret', async function () {
    const password = '1234';
    const encrypted = encryptProviderSecret(password);

    expect(encrypted).to.contain(novuSubMask);
    expect(encrypted).not.to.equal(password);
    expect(encrypted.length).to.equal(70);
  });

  it('should decrypt provider secret', async function () {
    const password = '123';
    const encrypted = encryptProviderSecret(password);
    const decrypted = decryptProviderSecret(encrypted);

    expect(decrypted).to.equal(password);
  });
});

describe('Encrypt provider credentials', function () {
  const novuSubMask = 'nvsk.';

  it('should encrypt provider credentials', async function () {
    const credentials: ICredentialsDto = {
      apiKey: 'api_123',
      user: 'Jock Wick',
      secretKey: 'secret_coins',
      domain: 'hollywood',
    };

    const encrypted = encryptCredentials(credentials);

    expect(encrypted.apiKey).to.contain(novuSubMask);
    expect(encrypted.apiKey).not.to.equal(credentials.apiKey);
    expect(encrypted.user).to.equal(credentials.user);
    expect(encrypted.secretKey).to.contain(novuSubMask);
    expect(encrypted.secretKey).not.to.equal(credentials.secretKey);
    expect(encrypted.domain).to.equal(credentials.domain);
  });

  it('should decrypt provider credentials', async function () {
    const credentials: ICredentialsDto = {
      apiKey: 'api_123',
      user: 'Jock Wick',
      secretKey: 'secret_coins',
      domain: 'hollywood',
    };

    const encrypted = encryptCredentials(credentials);
    const decrypted = decryptCredentials(encrypted);

    expect(decrypted.apiKey).to.equal(credentials.apiKey);
    expect(decrypted.user).to.equal(credentials.user);
    expect(decrypted.secretKey).to.equal(credentials.secretKey);
    expect(decrypted.domain).to.equal(credentials.domain);
  });
});
