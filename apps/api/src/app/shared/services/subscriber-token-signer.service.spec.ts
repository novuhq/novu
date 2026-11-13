import { generateKeyPairSync } from 'node:crypto';
import { inspect } from 'node:util';
import { expect } from 'chai';
import jwt, { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';

import { SubscriberTokenSigner, SubscriberTokenType } from './subscriber-token-signer.service';

const ENV_KEYS = ['JWT_SECRET', 'SUBSCRIBER_TOKEN_SIGNING_KEYS'] as const;

function generateP256Pem(): string {
  return generateKeyPairSync('ec', { namedCurve: 'P-256' }).privateKey.export({
    type: 'pkcs8',
    format: 'pem',
  }) as string;
}

function base64(pem: string): string {
  return Buffer.from(pem).toString('base64');
}

function signerWith(env: { JWT_SECRET?: string; SUBSCRIBER_TOKEN_SIGNING_KEYS?: string }): SubscriberTokenSigner {
  for (const key of ENV_KEYS) {
    delete process.env[key];
  }
  Object.assign(process.env, env);

  return new SubscriberTokenSigner();
}

function headerOf(token: string) {
  return jwt.decode(token, { complete: true })?.header;
}

function signLogin(signer: SubscriberTokenSigner, claims: Record<string, unknown> = { sub: 'subscriber-1' }): string {
  return signer.sign(SubscriberTokenType.LOGIN, claims, 3600);
}

describe('SubscriberTokenSigner', () => {
  const previousEnv = new Map<string, string | undefined>();

  before(() => {
    for (const key of ENV_KEYS) {
      previousEnv.set(key, process.env[key]);
    }
  });

  after(() => {
    for (const [key, value] of previousEnv) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  });

  describe('key derived from JWT_SECRET', () => {
    it('signs ES256 tokens with a kid and the token type, and verifies them', () => {
      const signer = signerWith({ JWT_SECRET: 'secret-a' });
      const token = signLogin(signer, { sub: 'subscriber-1', iss: 'env-1' });

      expect(headerOf(token)).to.include({ alg: 'ES256', typ: 'novu-subscriber+jwt' });
      expect(headerOf(token)?.kid).to.be.a('string').that.is.not.empty;
      expect(signer.verify(SubscriberTokenType.LOGIN, token)).to.include({ sub: 'subscriber-1', iss: 'env-1' });
    });

    it('gives every pod with the same JWT_SECRET the same key', () => {
      const token = signLogin(signerWith({ JWT_SECRET: 'secret-a' }));

      expect(signerWith({ JWT_SECRET: 'secret-a' }).verify(SubscriberTokenType.LOGIN, token).sub).to.equal(
        'subscriber-1'
      );
    });

    it('keeps the derived kid stable across releases', () => {
      const token = signLogin(signerWith({ JWT_SECRET: 'kid-stability-vector' }));

      expect(headerOf(token)?.kid).to.equal(DERIVED_KID_FOR_TEST_SECRET);
    });

    it('rejects tokens signed by a deployment with another JWT_SECRET', () => {
      const token = signLogin(signerWith({ JWT_SECRET: 'secret-a' }));

      expect(() => signerWith({ JWT_SECRET: 'secret-b' }).verify(SubscriberTokenType.LOGIN, token)).to.throw(
        JsonWebTokenError
      );
    });

    it('rejects an HS256 token signed with JWT_SECRET even when it copies the kid and type', () => {
      const signer = signerWith({ JWT_SECRET: 'secret-a' });
      const kid = headerOf(signLogin(signer))?.kid;
      const forged = jwt.sign({ sub: 'subscriber-1' }, 'secret-a', {
        algorithm: 'HS256',
        header: { alg: 'HS256', typ: SubscriberTokenType.LOGIN, kid },
      });

      expect(() => signer.verify(SubscriberTokenType.LOGIN, forged)).to.throw(JsonWebTokenError);
    });
  });

  describe('keys from SUBSCRIBER_TOKEN_SIGNING_KEYS', () => {
    const keyA = generateP256Pem();
    const keyB = generateP256Pem();

    it('uses the configured key instead of the JWT_SECRET one', () => {
      const configured = signerWith({ JWT_SECRET: 'secret-a', SUBSCRIBER_TOKEN_SIGNING_KEYS: base64(keyA) });
      const derived = signerWith({ JWT_SECRET: 'secret-a' });
      const token = signLogin(configured);

      expect(headerOf(token)?.kid).to.not.equal(headerOf(signLogin(derived))?.kid);
      expect(() => derived.verify(SubscriberTokenType.LOGIN, token)).to.throw(JsonWebTokenError);
    });

    it('rotates: the new first key signs while the previous key still verifies, until it is removed', () => {
      const before = signerWith({ JWT_SECRET: 'secret-a', SUBSCRIBER_TOKEN_SIGNING_KEYS: base64(keyA) });
      const during = signerWith({
        JWT_SECRET: 'secret-a',
        SUBSCRIBER_TOKEN_SIGNING_KEYS: `${base64(keyB)}, ${base64(keyA)}`,
      });
      const after = signerWith({ JWT_SECRET: 'secret-a', SUBSCRIBER_TOKEN_SIGNING_KEYS: base64(keyB) });
      const oldToken = signLogin(before);
      const newToken = signLogin(during);

      expect(headerOf(newToken)?.kid).to.not.equal(headerOf(oldToken)?.kid);
      expect(during.verify(SubscriberTokenType.LOGIN, oldToken).sub).to.equal('subscriber-1');
      expect(after.verify(SubscriberTokenType.LOGIN, newToken).sub).to.equal('subscriber-1');
      expect(() => after.verify(SubscriberTokenType.LOGIN, oldToken)).to.throw(JsonWebTokenError);
    });

    it('refuses to start on an entry that is not a P-256 private key, without echoing the entry', () => {
      const rsaKey = generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey.export({
        type: 'pkcs8',
        format: 'pem',
      }) as string;
      const p384Key = generateKeyPairSync('ec', { namedCurve: 'P-384' }).privateKey.export({
        type: 'pkcs8',
        format: 'pem',
      }) as string;

      for (const entry of [base64(rsaKey), base64(p384Key), 'not-a-key', '']) {
        const configured = `${base64(keyA)},${entry}`;
        let error: unknown;
        try {
          signerWith({ JWT_SECRET: 'secret-a', SUBSCRIBER_TOKEN_SIGNING_KEYS: configured });
        } catch (caught) {
          error = caught;
        }

        expect(error, `entry ${entry.slice(0, 12)}`).to.be.instanceOf(Error);
        expect((error as Error).message).to.contain('entry 2');
        expect((error as Error).message).to.not.contain(base64(keyA).slice(0, 40));
        if (entry) {
          expect((error as Error).message).to.not.contain(entry.slice(0, 40));
        }
      }
    });

    it('does not expose private keys when the service is logged', () => {
      const signer = signerWith({ JWT_SECRET: 'secret-a', SUBSCRIBER_TOKEN_SIGNING_KEYS: base64(keyA) });
      const keyBody = keyA.split('\n')[1];

      expect(inspect(signer, { depth: Infinity })).to.not.contain(keyBody);
      expect(JSON.stringify(signer)).to.not.contain(keyBody);
    });
  });

  describe('verification', () => {
    let signer: SubscriberTokenSigner;

    beforeEach(() => {
      signer = signerWith({ JWT_SECRET: 'secret-a' });
    });

    it('rejects a token of another type signed with a Novu key', () => {
      const keyPem = generateP256Pem();
      const configured = signerWith({ JWT_SECRET: 'secret-a', SUBSCRIBER_TOKEN_SIGNING_KEYS: base64(keyPem) });
      const kid = headerOf(signLogin(configured))?.kid;
      const otherType = jwt.sign({ sub: 'subscriber-1' }, keyPem, {
        algorithm: 'ES256',
        header: { alg: 'ES256', typ: 'JWT', kid },
      });

      expect(() => configured.verify(SubscriberTokenType.LOGIN, otherType)).to.throw(JsonWebTokenError);
    });

    it('rejects a token with an unknown or missing kid', () => {
      const keyPem = generateP256Pem();
      for (const kid of ['unknown', undefined]) {
        const token = jwt.sign({ sub: 'subscriber-1' }, keyPem, {
          algorithm: 'ES256',
          header: { alg: 'ES256', typ: SubscriberTokenType.LOGIN, kid },
        });

        expect(() => signer.verify(SubscriberTokenType.LOGIN, token)).to.throw(JsonWebTokenError);
      }
    });

    it('rejects an expired token as expired', () => {
      const expired = signer.sign(SubscriberTokenType.LOGIN, { sub: 'subscriber-1' }, -10);

      expect(() => signer.verify(SubscriberTokenType.LOGIN, expired)).to.throw(TokenExpiredError);
    });

    it('rejects a string that is not a token', () => {
      expect(() => signer.verify(SubscriberTokenType.LOGIN, 'not-a-token')).to.throw(JsonWebTokenError);
    });
  });
});

/* Computed outside Node (Python HKDF, OpenSSL point, RFC 7638 thumbprint) from the derivation spec. */
const DERIVED_KID_FOR_TEST_SECRET = 'cORdWRGUTFGDv1JNHSHzWHZCNBplz73ht913Kj7sLTQ';
