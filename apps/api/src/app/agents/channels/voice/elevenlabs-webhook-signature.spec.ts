import { createHmac } from 'node:crypto';
import { expect } from 'chai';
import { verifyElevenLabsSignature } from './elevenlabs-webhook-signature';

describe('verifyElevenLabsSignature', () => {
  const secret = 'whsec_test';
  const body = '{"type":"call_initiation_failure"}';

  function header(timestamp: number, payload = body, key = secret): string {
    const signature = createHmac('sha256', key).update(`${timestamp}.${payload}`).digest('hex');

    return `t=${timestamp},v0=${signature}`;
  }

  it('accepts a fresh signature over the raw body', () => {
    const timestamp = Math.floor(Date.now() / 1000);

    expect(verifyElevenLabsSignature(body, header(timestamp), secret)).to.equal(true);
  });

  it('rejects a signature for a different body', () => {
    const timestamp = Math.floor(Date.now() / 1000);

    expect(verifyElevenLabsSignature('{"type":"other"}', header(timestamp), secret)).to.equal(false);
  });

  it('rejects a signature that is too old', () => {
    const timestamp = Math.floor(Date.now() / 1000) - 60 * 60;

    expect(verifyElevenLabsSignature(body, header(timestamp), secret)).to.equal(false);
  });
});
