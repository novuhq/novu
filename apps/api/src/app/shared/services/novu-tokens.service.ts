import { createECDH, createHash, createPrivateKey, createPublicKey, hkdfSync, KeyObject } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ContextPayload, EnvironmentId, ISubscriberPayload, SubscriberId } from '@novu/shared';
import jwt, { JwtPayload, TokenExpiredError } from 'jsonwebtoken';

type TokenTyp = `novu-${string}-${string}+jwt`;

interface TokenKindSpec {
  typ: TokenTyp;
  maxLifetimeSeconds: number;
}

export const TOKEN_KINDS = {
  subscriberLogin: { typ: 'novu-subscriber-login+jwt', maxLifetimeSeconds: 60 * 60 },
} as const satisfies Record<string, TokenKindSpec>;

export type TokenKind = keyof typeof TOKEN_KINDS;

export enum SubscriberTokenScopeEnum {
  CHANNELS_SHARED = 'channels:shared',
}

export type SubscriberLoginProfile = Omit<ISubscriberPayload, 'channels'>;

export type SubscriberLoginClaims = {
  iss: EnvironmentId;
  aud: 'novu';
  sub: SubscriberId;
  context?: ContextPayload;
  subscriber?: SubscriberLoginProfile;
  scope: SubscriberTokenScopeEnum[];
  jti: string;
};

type TokenClaims = {
  subscriberLogin: SubscriberLoginClaims;
};

export type TokenVerification = { ok: true; claims: JwtPayload } | { ok: false; reason: 'expired' | 'invalid' };

export interface SignedToken {
  token: string;
  expiresAt: Date;
}

interface SigningKey {
  kid: string;
  privateKey: KeyObject;
}

interface TokenKeys {
  signing: SigningKey;
  publicKeysByKid: ReadonlyMap<string, KeyObject>;
}

const ALGORITHM = 'ES256';
const CLOCK_TOLERANCE_SECONDS = 60;
const INVALID: TokenVerification = { ok: false, reason: 'invalid' };
const JWT_SECRET_DERIVATION_INFO = 'novu token signing key v1';
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

function parseConfiguredKey(entry: string, position: number): KeyObject {
  const pem = Buffer.from(entry, 'base64').toString('utf8');
  const notOnePem = new Error(`NOVU_TOKEN_SIGNING_KEYS entry ${position} is not one base64-encoded PEM private key.`);
  if (pem.match(/-----BEGIN /g)?.length !== 1) {
    throw notOnePem;
  }

  let key: KeyObject;
  try {
    key = createPrivateKey(pem);
  } catch {
    throw notOnePem;
  }

  if (key.asymmetricKeyType !== 'ec' || key.asymmetricKeyDetails?.namedCurve !== 'prime256v1') {
    throw new Error(`NOVU_TOKEN_SIGNING_KEYS entry ${position} is not a P-256 (prime256v1) EC key.`);
  }

  return key;
}

/** RFC 7638 JWK thumbprint. */
function thumbprint(publicKey: KeyObject): string {
  const { crv, kty, x, y } = publicKey.export({ format: 'jwk' });

  return createHash('sha256').update(JSON.stringify({ crv, kty, x, y })).digest('base64url');
}

function loadKeys(configured: string | undefined, jwtSecret: string): TokenKeys {
  const entries = configured?.split(/[\s,]+/).filter(Boolean) ?? [];
  const privateKeys = entries.length
    ? entries.map((entry, index) => parseConfiguredKey(entry, index + 1))
    : [deriveKeyFromSecret(jwtSecret)];
  const keys = privateKeys.map((privateKey) => {
    const publicKey = createPublicKey(privateKey);

    return { kid: thumbprint(publicKey), privateKey, publicKey };
  });

  return {
    signing: keys[0],
    publicKeysByKid: new Map(keys.map(({ kid, publicKey }) => [kid, publicKey])),
  };
}

@Injectable()
export class NovuTokens {
  private readonly keys = loadKeys(process.env.NOVU_TOKEN_SIGNING_KEYS, `${process.env.JWT_SECRET}`);

  sign<K extends TokenKind>(kind: K, claims: TokenClaims[K], expiresInSeconds: number): SignedToken {
    const { typ, maxLifetimeSeconds } = TOKEN_KINDS[kind];
    if (!(expiresInSeconds > 0 && expiresInSeconds <= maxLifetimeSeconds)) {
      throw new Error(`A ${kind} token must expire within 1 to ${maxLifetimeSeconds} seconds.`);
    }

    const received: Record<string, unknown> = claims;
    const { iat: _iat, exp: _exp, nbf: _nbf, ...payload } = received;
    const { kid, privateKey } = this.keys.signing;

    const iat = Math.floor(Date.now() / 1000);
    const exp = iat + expiresInSeconds;
    const token = jwt.sign({ ...payload, iat, exp }, privateKey, {
      algorithm: ALGORITHM,
      header: { alg: ALGORITHM, typ, kid },
    });

    return { token, expiresAt: new Date(exp * 1000) };
  }

  verify(kind: TokenKind, token: string): TokenVerification {
    const { typ, maxLifetimeSeconds } = TOKEN_KINDS[kind];
    const header = jwt.decode(token, { complete: true })?.header;
    const publicKey = header?.typ === typ && header.kid ? this.keys.publicKeysByKid.get(header.kid) : undefined;
    if (!publicKey) {
      return INVALID;
    }

    let claims: JwtPayload;
    try {
      claims = jwt.verify(token, publicKey, { algorithms: [ALGORITHM] }) as JwtPayload;
    } catch (error) {
      return { ok: false, reason: error instanceof TokenExpiredError ? 'expired' : 'invalid' };
    }

    const nowSeconds = Math.floor(Date.now() / 1000);
    if (typeof claims.exp !== 'number' || claims.exp - nowSeconds > maxLifetimeSeconds + CLOCK_TOLERANCE_SECONDS) {
      return INVALID;
    }

    return { ok: true, claims };
  }
}
