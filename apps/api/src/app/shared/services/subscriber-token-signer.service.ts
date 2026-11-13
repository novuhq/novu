import { createECDH, createHash, createPrivateKey, createPublicKey, hkdfSync, KeyObject } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import jwt, { JsonWebTokenError, JwtPayload } from 'jsonwebtoken';

export enum SubscriberTokenType {
  LOGIN = 'novu-subscriber+jwt',
}

interface SigningKey {
  kid: string;
  privateKey: KeyObject;
}

interface SubscriberTokenKeys {
  signing: SigningKey;
  publicKeysByKid: ReadonlyMap<string, KeyObject>;
}

const ALGORITHM = 'ES256';
/* Changing this changes every self-hosted key, which invalidates every live token. */
const JWT_SECRET_DERIVATION_INFO = 'novu subscriber token signing key v1';
const P256_ORDER = 0xffffffff00000000ffffffffffffffffbce6faada7179e84f3b9cac2fc632551n;

/** HKDF to a P-256 scalar in [1, n - 1], reduced from 48 bytes so the bias is negligible (FIPS 186-4 B.4.1). */
function deriveKeyFromSecret(secret: string): KeyObject {
  const material = Buffer.from(hkdfSync('sha256', secret, '', JWT_SECRET_DERIVATION_INFO, 48));
  const scalar = (BigInt(`0x${material.toString('hex')}`) % (P256_ORDER - 1n)) + 1n;
  const d = Buffer.from(scalar.toString(16).padStart(64, '0'), 'hex');

  const ecdh = createECDH('prime256v1');
  ecdh.setPrivateKey(d);
  const publicPoint = ecdh.getPublicKey();

  return createPrivateKey({
    format: 'jwk',
    key: {
      kty: 'EC',
      crv: 'P-256',
      d: d.toString('base64url'),
      x: publicPoint.subarray(1, 33).toString('base64url'),
      y: publicPoint.subarray(33).toString('base64url'),
    },
  });
}

/** Error messages name the entry by position only, so key material never reaches logs. */
function parseConfiguredKeys(configured: string): KeyObject[] {
  return configured.split(',').map((entry, index) => {
    const position = index + 1;
    let key: KeyObject;
    try {
      key = createPrivateKey(Buffer.from(entry.trim(), 'base64').toString('utf8'));
    } catch {
      throw new Error(`SUBSCRIBER_TOKEN_SIGNING_KEYS entry ${position} is not a base64-encoded PEM private key.`);
    }

    if (key.asymmetricKeyType !== 'ec' || key.asymmetricKeyDetails?.namedCurve !== 'prime256v1') {
      throw new Error(`SUBSCRIBER_TOKEN_SIGNING_KEYS entry ${position} is not a P-256 (prime256v1) EC key.`);
    }

    return key;
  });
}

/** RFC 7638 JWK thumbprint, so the same key always gets the same `kid` on every pod. */
function thumbprint(publicKey: KeyObject): string {
  const { crv, kty, x, y } = publicKey.export({ format: 'jwk' });

  return createHash('sha256').update(JSON.stringify({ crv, kty, x, y })).digest('base64url');
}

function loadKeys(configured: string | undefined, jwtSecret: string): SubscriberTokenKeys {
  const privateKeys = configured?.trim() ? parseConfiguredKeys(configured) : [deriveKeyFromSecret(jwtSecret)];
  const keys = privateKeys.map((privateKey) => {
    const publicKey = createPublicKey(privateKey);

    return { kid: thumbprint(publicKey), privateKey, publicKey };
  });

  return {
    signing: keys[0],
    publicKeysByKid: new Map(keys.map(({ kid, publicKey }) => [kid, publicKey])),
  };
}

/**
 * Signs and verifies subscriber tokens with Novu's own ES256 key set, shared by every environment.
 * `SUBSCRIBER_TOKEN_SIGNING_KEYS` lists the keys: the first one signs, every one verifies.
 * When it is unset, a single key is derived from `JWT_SECRET`, so every API pod agrees with no storage.
 */
@Injectable()
export class SubscriberTokenSigner {
  private readonly keys = loadKeys(process.env.SUBSCRIBER_TOKEN_SIGNING_KEYS, `${process.env.JWT_SECRET}`);

  sign(type: SubscriberTokenType, claims: Record<string, unknown>, expiresInSeconds: number): string {
    const { kid, privateKey } = this.keys.signing;

    return jwt.sign(claims, privateKey, {
      algorithm: ALGORITHM,
      header: { alg: ALGORITHM, typ: type, kid },
      expiresIn: expiresInSeconds,
    });
  }

  /** Throws `TokenExpiredError` for an expired token and `JsonWebTokenError` for any other rejection. */
  verify(type: SubscriberTokenType, token: string): JwtPayload {
    const header = jwt.decode(token, { complete: true })?.header;
    if (header?.typ !== type) {
      throw new JsonWebTokenError('invalid token type');
    }

    const publicKey = header.kid ? this.keys.publicKeysByKid.get(header.kid) : undefined;
    if (!publicKey) {
      throw new JsonWebTokenError('unknown signing key');
    }

    return jwt.verify(token, publicKey, { algorithms: [ALGORITHM] }) as JwtPayload;
  }
}
