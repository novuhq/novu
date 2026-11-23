import { createHmac } from 'crypto';
import { buildNovuSignatureHeader } from './hmac';

describe('buildNovuSignatureHeader', () => {
  const payload = { hello: 'world' };

  function signatureFor(secretKey: string, timestamp: string): string {
    return createHmac('sha256', secretKey)
      .update(`${timestamp}.${JSON.stringify(payload)}`)
      .digest('hex');
  }

  it('keeps a single-key header in the original format', () => {
    const header = buildNovuSignatureHeader('key-a', payload);

    expect(header).toMatch(/^t=\d+,v1=[0-9a-f]{64}$/);

    const [timestampPart, signaturePart] = header.split(',');
    const timestamp = timestampPart.slice(2);

    expect(signaturePart).toBe(`v1=${signatureFor('key-a', timestamp)}`);
  });

  it('signs with every active key and keeps the original key first', () => {
    const header = buildNovuSignatureHeader(['original', 'rotated'], payload);
    const [timestampPart, first, second, extra] = header.split(',');
    const timestamp = timestampPart.slice(2);

    expect(extra).toBeUndefined();
    expect(first).toBe(`v1=${signatureFor('original', timestamp)}`);
    expect(second).toBe(`v1=${signatureFor('rotated', timestamp)}`);
  });

  it('throws when no secret key is provided', () => {
    expect(() => buildNovuSignatureHeader([], payload)).toThrow(/secret key/i);
  });
});
