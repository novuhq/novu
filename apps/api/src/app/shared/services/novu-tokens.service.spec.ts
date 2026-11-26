import { generateKeyPairSync } from 'node:crypto';
import { inspect } from 'node:util';
import { expect } from 'chai';
import jwt from 'jsonwebtoken';

import { NovuTokens, SubscriberLoginClaims, TOKEN_KINDS } from './novu-tokens.service';

const ENV_KEYS = ['JWT_SECRET', 'NOVU_TOKEN_SIGNING_KEYS'] as const;
const LOGIN_TYP = TOKEN_KINDS.subscriberLogin.typ;
const YEAR_SECONDS = 365 * 24 * 60 * 60;
const LOGIN_CLAIMS: SubscriberLoginClaims = { iss: 'env-1', aud: 'novu', sub: 'subscriber-1', scope: [], jti: 'jti-1' };

function generateP256Pem(): string {
  return generateKeyPairSync('ec', { namedCurve: 'P-256' }).privateKey.export({
    type: 'pkcs8',
    format: 'pem',
  }) as string;
}

function base64(pem: string): string {
  return Buffer.from(pem).toString('base64');
}

function tokensWith(env: { JWT_SECRET?: string; NOVU_TOKEN_SIGNING_KEYS?: string }): NovuTokens {
  for (const key of ENV_KEYS) {
    delete process.env[key];
  }
  Object.assign(process.env, env);

  return new NovuTokens();
}

function headerOf(token: string) {
  return jwt.decode(token, { complete: true })?.header;
}

function payloadOf(token: string) {
  return jwt.decode(token, { json: true });
}

function signLogin(tokens: NovuTokens, claims: SubscriberLoginClaims = LOGIN_CLAIMS): string {
  return tokens.sign('subscriberLogin', claims, 3600).token;
}

function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

describe('NovuTokens', () => {
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
    it('signs ES256 tokens with a kid and the kind typ, and verifies them', () => {
      const tokens = tokensWith({ JWT_SECRET: 'secret-a' });
      const token = signLogin(tokens);

      expect(headerOf(token)).to.include({ alg: 'ES256', typ: 'novu-subscriber-login+jwt' });
      expect(headerOf(token)?.kid).to.be.a('string').that.is.not.empty;
      expect(tokens.verify('subscriberLogin', token)).to.deep.include({ ok: true });
      expect(tokens.verify('subscriberLogin', token)).to.have.nested.include({
        'claims.sub': 'subscriber-1',
        'claims.iss': 'env-1',
      });
    });

    it('gives every pod with the same JWT_SECRET the same key', () => {
      const token = signLogin(tokensWith({ JWT_SECRET: 'secret-a' }));

      expect(tokensWith({ JWT_SECRET: 'secret-a' }).verify('subscriberLogin', token).ok).to.equal(true);
    });

    it('keeps the derived kid stable across releases', () => {
      const token = signLogin(tokensWith({ JWT_SECRET: 'kid-stability-vector' }));

      expect(headerOf(token)?.kid).to.equal(INDEPENDENTLY_COMPUTED_KID);
    });

    it('rejects tokens signed by a deployment with another JWT_SECRET', () => {
      const token = signLogin(tokensWith({ JWT_SECRET: 'secret-a' }));

      expect(tokensWith({ JWT_SECRET: 'secret-b' }).verify('subscriberLogin', token)).to.deep.equal({
        ok: false,
        reason: 'invalid',
      });
    });

    it('rejects an HS256 token signed with JWT_SECRET even when it copies the kid and typ', () => {
      const tokens = tokensWith({ JWT_SECRET: 'secret-a' });
      const kid = headerOf(signLogin(tokens))?.kid;
      const forged = jwt.sign({ sub: 'subscriber-1' }, 'secret-a', {
        algorithm: 'HS256',
        header: { alg: 'HS256', typ: LOGIN_TYP, kid },
        expiresIn: 60,
      });

      expect(tokens.verify('subscriberLogin', forged).ok).to.equal(false);
    });
  });

  describe('keys from NOVU_TOKEN_SIGNING_KEYS', () => {
    const keyA = generateP256Pem();
    const keyB = generateP256Pem();

    it('uses the configured key instead of the JWT_SECRET one', () => {
      const configured = tokensWith({ JWT_SECRET: 'secret-a', NOVU_TOKEN_SIGNING_KEYS: base64(keyA) });
      const derived = tokensWith({ JWT_SECRET: 'secret-a' });
      const token = signLogin(configured);

      expect(headerOf(token)?.kid).to.not.equal(headerOf(signLogin(derived))?.kid);
      expect(derived.verify('subscriberLogin', token).ok).to.equal(false);
    });

    it('rotates in stages so pods on adjacent stages accept each other during a rolling restart', () => {
      const stages = [[keyA], [keyA, keyB], [keyB, keyA], [keyB]].map((keys) =>
        tokensWith({ JWT_SECRET: 'secret-a', NOVU_TOKEN_SIGNING_KEYS: keys.map(base64).join(',') })
      );

      for (let stage = 1; stage < stages.length; stage += 1) {
        const previous = stages[stage - 1];
        const current = stages[stage];

        expect(current.verify('subscriberLogin', signLogin(previous)).ok, `stage ${stage + 1} accepts stage ${stage}`)
          .to.be.true;
        expect(previous.verify('subscriberLogin', signLogin(current)).ok, `stage ${stage} accepts stage ${stage + 1}`)
          .to.be.true;
      }
      expect(stages[3].verify('subscriberLogin', signLogin(stages[0])).ok).to.equal(false);
    });

    it('accepts keys separated by commas, spaces or newlines, and ignores empty entries', () => {
      const tokens = tokensWith({
        JWT_SECRET: 'secret-a',
        NOVU_TOKEN_SIGNING_KEYS: `\n${base64(keyA)}\n ${base64(keyB)}, ,`,
      });
      const signedWithB = signLogin(tokensWith({ JWT_SECRET: 'secret-a', NOVU_TOKEN_SIGNING_KEYS: base64(keyB) }));

      expect(tokens.verify('subscriberLogin', signedWithB).ok).to.equal(true);
    });

    it('refuses to start on an entry that is not exactly one P-256 private key, without echoing the entry', () => {
      const rsaKey = generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey.export({
        type: 'pkcs8',
        format: 'pem',
      }) as string;
      const p384Key = generateKeyPairSync('ec', { namedCurve: 'P-384' }).privateKey.export({
        type: 'pkcs8',
        format: 'pem',
      }) as string;

      for (const entry of [base64(rsaKey), base64(p384Key), 'not-a-key', base64(keyA + keyB)]) {
        let error: unknown;
        try {
          tokensWith({ JWT_SECRET: 'secret-a', NOVU_TOKEN_SIGNING_KEYS: `${base64(keyA)},${entry}` });
        } catch (caught) {
          error = caught;
        }

        expect(error, `entry ${entry.slice(0, 12)}`).to.be.instanceOf(Error);
        expect((error as Error).message).to.contain('entry 2');
        expect((error as Error).message).to.not.contain(base64(keyA).slice(0, 40));
        expect((error as Error).message).to.not.contain(entry.slice(0, 40));
      }
    });

    it('does not expose private keys when the service is logged', () => {
      const tokens = tokensWith({ JWT_SECRET: 'secret-a', NOVU_TOKEN_SIGNING_KEYS: base64(keyA) });
      const keyBody = keyA.split('\n')[1];

      expect(inspect(tokens, { depth: Infinity })).to.not.contain(keyBody);
      expect(JSON.stringify(tokens)).to.not.contain(keyBody);
    });
  });

  describe('signing', () => {
    it('sets iat and exp itself, ignoring timestamps in the claims', () => {
      const tokens = tokensWith({ JWT_SECRET: 'secret-a' });
      const future = nowSeconds() + YEAR_SECONDS;
      const claimsWithTimestamps = { ...LOGIN_CLAIMS, iat: future, exp: future, nbf: future };
      const { token, expiresAt } = tokens.sign('subscriberLogin', claimsWithTimestamps, 60);
      const payload = payloadOf(token);

      expect(payload?.iat).to.be.closeTo(nowSeconds(), 5);
      expect(payload?.exp).to.equal((payload?.iat ?? 0) + 60);
      expect(expiresAt.getTime()).to.equal((payload?.exp ?? 0) * 1000);
      expect(payload).to.not.have.property('nbf');
      expect(tokens.verify('subscriberLogin', token).ok).to.equal(true);
    });

    it('refuses a lifetime longer than the kind allows, or one that is not positive', () => {
      const tokens = tokensWith({ JWT_SECRET: 'secret-a' });
      const max = TOKEN_KINDS.subscriberLogin.maxLifetimeSeconds;

      for (const lifetime of [max + 1, 0, -10]) {
        expect(() => tokens.sign('subscriberLogin', LOGIN_CLAIMS, lifetime), `${lifetime}`).to.throw('subscriberLogin');
      }
    });
  });

  describe('verification', () => {
    const keyPem = generateP256Pem();
    let tokens: NovuTokens;
    let kid: string | undefined;

    function signWithNovuKey(claims: Record<string, unknown>, header: Record<string, unknown> = {}): string {
      return jwt.sign(claims, keyPem, { algorithm: 'ES256', header: { alg: 'ES256', typ: LOGIN_TYP, kid, ...header } });
    }

    beforeEach(() => {
      tokens = tokensWith({ JWT_SECRET: 'secret-a', NOVU_TOKEN_SIGNING_KEYS: base64(keyPem) });
      kid = headerOf(signLogin(tokens))?.kid;
    });

    it('rejects a token of another typ signed with a Novu key', () => {
      const otherTyp = signWithNovuKey({ sub: 'subscriber-1', exp: nowSeconds() + 60 }, { typ: 'JWT' });

      expect(tokens.verify('subscriberLogin', otherTyp)).to.deep.equal({ ok: false, reason: 'invalid' });
    });

    it('rejects a token with an unknown or missing kid', () => {
      for (const unknownKid of ['unknown', undefined]) {
        const token = signWithNovuKey({ sub: 'subscriber-1', exp: nowSeconds() + 60 }, { kid: unknownKid });

        expect(tokens.verify('subscriberLogin', token).ok, `kid ${unknownKid}`).to.equal(false);
      }
    });

    it('reports an expired token as expired', () => {
      const expired = signWithNovuKey({ sub: 'subscriber-1', exp: nowSeconds() - 10 });

      expect(tokens.verify('subscriberLogin', expired)).to.deep.include({ ok: false, reason: 'expired' });
      expect(tokens.verify('subscriberLogin', expired)).to.have.nested.property('claims.sub', 'subscriber-1');
    });

    it('rejects a Novu-signed token that outlives the kind maximum or never expires', () => {
      const longLived = signWithNovuKey({ sub: 'subscriber-1', exp: nowSeconds() + YEAR_SECONDS });
      const neverExpires = signWithNovuKey({ sub: 'subscriber-1' });

      expect(tokens.verify('subscriberLogin', longLived)).to.deep.equal({ ok: false, reason: 'invalid' });
      expect(tokens.verify('subscriberLogin', neverExpires)).to.deep.equal({ ok: false, reason: 'invalid' });
    });

    it('rejects a string that is not a token', () => {
      expect(tokens.verify('subscriberLogin', 'not-a-token')).to.deep.equal({ ok: false, reason: 'invalid' });
    });
  });
});

const INDEPENDENTLY_COMPUTED_KID = 'oOEBbw7zZll4pPLOL4dtP1y-g-apoFRrxGwVGSFNFIY';
