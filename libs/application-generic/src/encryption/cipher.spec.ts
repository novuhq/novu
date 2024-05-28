import { decrypt, encrypt } from './cipher';

describe('Encrypt secret', function () {
  it('should encrypt a credential', async function () {
    const password = '123';
    const encrypted = encrypt(password);

    expect(encrypted).not.toEqual(password);
    expect(encrypted.length).toEqual(65);
  });

  it('should decrypt a credential', async function () {
    const password = '123';
    const encrypted = encrypt(password);
    const decrypted = decrypt(encrypted);

    expect(decrypted).toEqual(password);
  });
});
