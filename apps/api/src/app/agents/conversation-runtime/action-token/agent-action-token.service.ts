import { Injectable } from '@nestjs/common';
import { CacheService, PinoLogger } from '@novu/application-generic';
import type { ButtonElement, CardElement } from 'chat';
import { callbackPayloadNeedsTokenization, forEachCallbackButton } from './card-callback-button.walker';
import {
  buildOpaqueStorageKey,
  isMintedOpaqueActionId,
  mintRandomToken,
  parseTtlFromEnv,
} from './opaque-token.util';

export const AGENT_ACTION_TOKEN_PREFIX = 'at:' as const;

const KEY_PREFIX = 'agent:action:';
const DEFAULT_TTL_SECONDS = 60 * 60 * 24 * 3;
const TOKEN_BYTES = 16;

export interface AgentActionTokenClaims {
  id: string;
  value?: string;
  agentId: string;
  integrationIdentifier: string;
  environmentId: string;
  organizationId: string;
}

export interface AgentActionTokenBinding {
  agentId: string;
  integrationIdentifier: string;
  environmentId: string;
  organizationId: string;
}

@Injectable()
export class AgentActionTokenService {
  private readonly ttlSeconds: number;

  constructor(
    private readonly cacheService: CacheService,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
    this.ttlSeconds = parseTtlFromEnv(process.env.AGENT_ACTION_TOKEN_TTL, DEFAULT_TTL_SECONDS);
  }

  isActionToken(actionId: string | undefined): boolean {
    return isMintedOpaqueActionId(actionId, AGENT_ACTION_TOKEN_PREFIX, TOKEN_BYTES);
  }

  async mintActionToken(claims: AgentActionTokenClaims): Promise<string> {
    const token = mintRandomToken(TOKEN_BYTES);

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

    if (!this.claimsMatchBinding(claims, binding)) {
      return null;
    }

    return { id: claims.id, value: claims.value };
  }

  async resolveForDispatch(
    actionId: string,
    value: string | undefined,
    binding: AgentActionTokenBinding
  ): Promise<{ id: string; value?: string } | null> {
    if (!this.isActionToken(actionId)) {
      return { id: actionId, value };
    }

    const resolved = await this.resolveActionToken(actionId, binding);

    if (!resolved) {
      this.logger.warn(
        {
          agentId: binding.agentId,
          integrationIdentifier: binding.integrationIdentifier,
          actionId: this.isActionToken(actionId) ? `${actionId.slice(0, AGENT_ACTION_TOKEN_PREFIX.length)}[redacted]` : actionId,
        },
        'Ignoring inbound action — token missing, expired, or binding mismatch'
      );
    }

    return resolved;
  }

  async tokenizeCardForDelivery(
    card: Record<string, unknown>,
    binding: AgentActionTokenBinding
  ): Promise<Record<string, unknown>> {
    const clone = structuredClone(card) as unknown as CardElement;
    const replacements: Array<{ button: ButtonElement; token: string }> = [];

    await forEachCallbackButton(clone, async (button) => {
      const buttonValue = typeof button.value === 'string' ? button.value : undefined;

      if (!callbackPayloadNeedsTokenization(button.id, buttonValue)) {
        return;
      }

      const token = await this.mintActionToken({
        ...binding,
        id: button.id,
        value: typeof button.value === 'string' ? button.value : undefined,
      });

      replacements.push({ button, token });
    });

    for (const { button, token } of replacements) {
      button.id = token;
      delete button.value;
    }

    return clone as unknown as Record<string, unknown>;
  }

  private claimsMatchBinding(claims: AgentActionTokenClaims, binding: AgentActionTokenBinding): boolean {
    return (
      claims.agentId === binding.agentId &&
      claims.integrationIdentifier === binding.integrationIdentifier &&
      claims.environmentId === binding.environmentId &&
      claims.organizationId === binding.organizationId
    );
  }

  private storageKey(token: string): string {
    return buildOpaqueStorageKey(KEY_PREFIX, token);
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
