import { expect } from 'chai';
import { decrypt, encrypt } from './cipher';

describe('Encrypt secret', function () {
  it('should encrypt a credential', async function () {
    const password = '123';
    const encrypted = encrypt(password);

    expect(encrypted).to.not.equal(password);
    expect(encrypted.length).to.equal(65);
  });

  it('should decrypt a credential', async function () {
    const password = '123';
    const encrypted = encrypt(password);
    const decrypted = decrypt(encrypted);

    expect(decrypted).to.equal(password);
  });
});
