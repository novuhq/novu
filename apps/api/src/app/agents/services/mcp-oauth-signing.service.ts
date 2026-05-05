import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { BadRequestException, Injectable } from '@nestjs/common';

const SIGNATURE_VERSION = 'v1';
const DEFAULT_TTL_MS = 10 * 60 * 1000;

export interface OauthConnectPayload {
  organizationId: string;
  environmentId: string;
  subscriberId: string;
  agentId: string;
  agentIdentifier: string;
  conversationId: string;
  mcpServerName: string;
  /** Unix epoch ms — used to enforce TTL. */
  issuedAt: number;
  /** Random nonce so two clicks of the same connect link aren't identical. */
  nonce: string;
}

/**
 * HMAC-signs the payload that flows between the worker (which generates the link),
 * the OAuth start endpoint (verifies signature, redirects to provider), and the
 * OAuth callback endpoint (verifies signature again, exchanges code).
 *
 * Keyed by NOVU_SECRET_KEY so a leaked URL can't be used cross-environment.
 */
@Injectable()
export class McpOauthSigningService {
  signPayload(payload: OauthConnectPayload): string {
    const json = JSON.stringify(payload);
    const encoded = base64UrlEncode(Buffer.from(json));
    const signature = this.hmac(encoded);

    return `${SIGNATURE_VERSION}.${encoded}.${signature}`;
  }

  verifyPayload(token: string, options: { ttlMs?: number } = {}): OauthConnectPayload {
    const parts = token.split('.');
    if (parts.length !== 3 || parts[0] !== SIGNATURE_VERSION) {
      throw new BadRequestException('Invalid OAuth connect token format.');
    }

    const [, encoded, signature] = parts;
    const expected = this.hmac(encoded);

    let signaturesEqual = false;
    try {
      signaturesEqual = timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'));
    } catch {
      signaturesEqual = false;
    }

    if (!signaturesEqual) {
      throw new BadRequestException('OAuth connect token signature mismatch.');
    }

    const json = base64UrlDecode(encoded).toString('utf8');
    let payload: OauthConnectPayload;
    try {
      payload = JSON.parse(json);
    } catch {
      throw new BadRequestException('OAuth connect token payload is malformed.');
    }

    const ttl = options.ttlMs ?? DEFAULT_TTL_MS;
    if (Date.now() - payload.issuedAt > ttl) {
      throw new BadRequestException('OAuth connect link has expired. Ask Claude to send a new one.');
    }

    return payload;
  }

  newNonce(): string {
    return randomBytes(16).toString('hex');
  }

  private hmac(input: string): string {
    const secret = process.env.NOVU_SECRET_KEY;
    if (!secret) {
      // Server misconfiguration — fail loudly so it's caught in CI/dev rather than at
      // runtime against real users.
      throw new Error('NOVU_SECRET_KEY is required to sign MCP OAuth connect tokens.');
    }

    return createHmac('sha256', secret).update(input).digest('hex');
  }
}

function base64UrlEncode(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(input: string): Buffer {
  const padded = input
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .padEnd(Math.ceil(input.length / 4) * 4, '=');

  return Buffer.from(padded, 'base64');
}
