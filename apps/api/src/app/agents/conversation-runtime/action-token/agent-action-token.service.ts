import { randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { CacheService, PinoLogger } from '@novu/application-generic';

export const AGENT_ACTION_TOKEN_PREFIX = 'at:' as const;

const KEY_PREFIX = 'agent:action:';
const DEFAULT_TTL_SECONDS = 60 * 60 * 24 * 3;
const TOKEN_BYTES = 16;

export type AgentActionTokenClaims = {
  id: string;
  value?: string;
  agentId: string;
  integrationIdentifier: string;
  environmentId: string;
  organizationId: string;
};

export type AgentActionTokenBinding = {
  agentId: string;
  integrationIdentifier: string;
};

type CardChild = Record<string, unknown>;

@Injectable()
export class AgentActionTokenService {
  private readonly ttlSeconds: number;

  constructor(
    private readonly cacheService: CacheService,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
    const raw = process.env.AGENT_ACTION_TOKEN_TTL;
    const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN;
    this.ttlSeconds = Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_TTL_SECONDS;
  }

  isActionToken(actionId: string | undefined): boolean {
    return Boolean(actionId?.startsWith(AGENT_ACTION_TOKEN_PREFIX));
  }

  async mintActionToken(claims: AgentActionTokenClaims): Promise<string> {
    const token = randomBytes(TOKEN_BYTES).toString('base64url');

    await this.cacheService.set(this.storageKey(token), JSON.stringify(claims), { ttl: this.ttlSeconds });

    return `${AGENT_ACTION_TOKEN_PREFIX}${token}`;
  }

  async resolveActionToken(
    rawActionId: string,
    binding: AgentActionTokenBinding
  ): Promise<{ id: string; value?: string } | null> {
    if (!this.isActionToken(rawActionId)) {
      return null;
    }

    const token = rawActionId.slice(AGENT_ACTION_TOKEN_PREFIX.length);
    if (!token) {
      return null;
    }

    let raw: string | null | undefined;
    try {
      raw = await this.cacheService.get(this.storageKey(token));
    } catch (err) {
      this.logger.warn(
        { err: err instanceof Error ? err.message : String(err), agentId: binding.agentId },
        'Agent action token cache unavailable during resolve'
      );

      return null;
    }

    if (!raw) {
      return null;
    }

    const claims = this.parseClaims(raw);
    if (!claims) {
      return null;
    }

    if (
      claims.agentId !== binding.agentId ||
      claims.integrationIdentifier !== binding.integrationIdentifier
    ) {
      this.logger.warn(
        {
          agentId: binding.agentId,
          integrationIdentifier: binding.integrationIdentifier,
          tokenAgentId: claims.agentId,
          tokenIntegrationIdentifier: claims.integrationIdentifier,
        },
        'Agent action token binding mismatch'
      );

      return null;
    }

    return { id: claims.id, value: claims.value };
  }

  async tokenizeCardForDelivery(
    card: Record<string, unknown>,
    claimsBase: Omit<AgentActionTokenClaims, 'id' | 'value'>
  ): Promise<Record<string, unknown>> {
    const clone = structuredClone(card) as Record<string, unknown>;
    const children = clone.children;

    if (!Array.isArray(children)) {
      return clone;
    }

    await this.tokenizeCardChildren(children, claimsBase);

    return clone;
  }

  private async tokenizeCardChildren(
    children: CardChild[],
    claimsBase: Omit<AgentActionTokenClaims, 'id' | 'value'>
  ): Promise<void> {
    for (const child of children) {
      if (!child || typeof child !== 'object') {
        continue;
      }

      if (child.type === 'actions' && Array.isArray(child.children)) {
        await this.tokenizeActionBlockChildren(child.children as CardChild[], claimsBase);
        continue;
      }

      if (child.type === 'section' && Array.isArray(child.children)) {
        await this.tokenizeCardChildren(child.children as CardChild[], claimsBase);
      }
    }
  }

  private async tokenizeActionBlockChildren(
    actions: CardChild[],
    claimsBase: Omit<AgentActionTokenClaims, 'id' | 'value'>
  ): Promise<void> {
    for (const action of actions) {
      if (!action || typeof action !== 'object' || action.type !== 'button') {
        continue;
      }

      const actionId = action.id;
      if (typeof actionId !== 'string' || !actionId) {
        continue;
      }

      const value = typeof action.value === 'string' ? action.value : undefined;
      const token = await this.mintActionToken({
        ...claimsBase,
        id: actionId,
        value,
      });

      action.id = token;
      delete action.value;
    }
  }

  private storageKey(token: string): string {
    return `${KEY_PREFIX}${token}`;
  }

  private parseClaims(raw: string): AgentActionTokenClaims | null {
    try {
      const parsed = JSON.parse(raw) as Partial<AgentActionTokenClaims>;
      if (
        !parsed ||
        typeof parsed !== 'object' ||
        typeof parsed.id !== 'string' ||
        !parsed.id ||
        typeof parsed.agentId !== 'string' ||
        typeof parsed.integrationIdentifier !== 'string' ||
        typeof parsed.environmentId !== 'string' ||
        typeof parsed.organizationId !== 'string'
      ) {
        return null;
      }

      return {
        id: parsed.id,
        value: typeof parsed.value === 'string' ? parsed.value : undefined,
        agentId: parsed.agentId,
        integrationIdentifier: parsed.integrationIdentifier,
        environmentId: parsed.environmentId,
        organizationId: parsed.organizationId,
      };
    } catch (err) {
      this.logger.warn({ err }, 'Failed to parse stored agent action token entry');

      return null;
    }
  }
}
