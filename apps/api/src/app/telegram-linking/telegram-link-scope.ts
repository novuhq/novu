/**
 * Discriminates Telegram subscriber-link issuance/consumption:
 * - `agent` — integration is attached to an agent (existing agent webhook path)
 * - `integration` — Integrations-page bot with no agent attachment
 */
export type TelegramLinkScope = { mode: 'agent'; agentIdentifier: string } | { mode: 'integration' };

export function agentTelegramLinkScope(agentIdentifier: string): TelegramLinkScope {
  return { mode: 'agent', agentIdentifier };
}

export function integrationTelegramLinkScope(): TelegramLinkScope {
  return { mode: 'integration' };
}

export function isTelegramLinkScope(value: unknown): value is TelegramLinkScope {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const scope = value as Record<string, unknown>;

  if (scope.mode === 'integration') {
    return true;
  }

  if (scope.mode === 'agent' && typeof scope.agentIdentifier === 'string' && scope.agentIdentifier.length > 0) {
    return true;
  }

  return false;
}

export function telegramLinkScopeMode(scope: TelegramLinkScope): 'agent' | 'integration' {
  return scope.mode;
}

export function telegramLinkScopeAgentIdentifier(scope: TelegramLinkScope): string {
  if (scope.mode !== 'agent') {
    return '';
  }

  return scope.agentIdentifier;
}
