import { randomUUID } from 'node:crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { CacheService, PinoLogger } from '@novu/application-generic';

const TOKEN_AUDIENCE = 'agent_email_action';
const TOKEN_ISSUER = 'novu_api';
const DEFAULT_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

export interface AgentEmailActionClaims {
  /** Mongo `_id` of the agent. Used to look up cached chat instance + resolve config. */
  agentId: string;
  /** Stable agent identifier slug (mirrors what the dashboard URLs use). */
  agentIdentifier: string;
  integrationIdentifier: string;
  environmentId: string;
  organizationId: string;
  /** Encoded thread id from the email adapter's ThreadResolver. */
  threadId: string;
  /** RFC-5322 Message-ID of the email the button was rendered in. */
  messageId: string;
  /** `id` of the clicked `<Button>` — forwarded to onAction. */
  actionId: string;
  /** Optional `value` of the clicked `<Button>` — forwarded to onAction. */
  value?: string;
  /** Display label shown on the confirmation page; not security-sensitive. */
  label?: string;
  /** Email address of the recipient — used as `platformUserId` for subscriber resolution. */
  userIdentifier: string;
  /** Unique token id for single-use enforcement. */
  jti: string;
}

export interface VerifiedAgentEmailActionClaims extends AgentEmailActionClaims {
  /** Seconds since epoch when this token expires. Used to compute the single-use Redis TTL. */
  exp: number;
}

@Injectable()
export class AgentEmailActionTokenService {
  private readonly ttlSeconds: number;

  constructor(
    private readonly jwtService: JwtService,
    private readonly cacheService: CacheService,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
    const raw = process.env.AGENT_EMAIL_ACTION_JWT_TTL;
    const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN;
    this.ttlSeconds = Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_TTL_SECONDS;
  }

  async signActionToken(claims: Omit<AgentEmailActionClaims, 'jti'>): Promise<{ token: string; url: string }> {
    const jti = randomUUID();
    const token = await this.jwtService.signAsync(
      { ...claims, jti },
      { issuer: TOKEN_ISSUER, audience: TOKEN_AUDIENCE, expiresIn: this.ttlSeconds }
    );

    const base = (process.env.API_ROOT_URL ?? '').replace(/\/$/, '');
    if (!base) {
      throw new Error('API_ROOT_URL is not configured — cannot build email action URL');
    }
    const url = `${base}/v1/agents/email/actions/preview?t=${encodeURIComponent(token)}`;

    return { token, url };
  }

  verifyActionToken(token: string): VerifiedAgentEmailActionClaims {
    try {
      return this.jwtService.verify<VerifiedAgentEmailActionClaims>(token, {
        issuer: TOKEN_ISSUER,
        audience: TOKEN_AUDIENCE,
      });
    } catch (err) {
      this.logger.debug({ err }, 'Failed to verify agent email action token');
      throw new UnauthorizedException('Invalid or expired action link');
    }
  }

  /**
   * Atomically reserves the token's `jti` as used. Returns `true` on first call and `false`
   * on every subsequent call — defending against email-client URL prefetchers (Outlook Safe
   * Links, Mimecast etc.) and against accidental double-submits.
   *
   * The TTL matches the token's remaining lifetime; once the JWT expires, the marker would be
   * rejected by signature/exp anyway, so we don't need the marker to outlive the token.
   */
  async claimSingleUse(jti: string, exp: number): Promise<boolean> {
    const nowSeconds = Math.floor(Date.now() / 1000);
    const ttl = Math.max(60, exp - nowSeconds);
    const result = await this.cacheService.setIfNotExist(`agent:email:action:used:${jti}`, '1', { ttl });

    return result === 'OK';
  }
}
