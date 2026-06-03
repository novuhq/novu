import { type DcrProviderStrategy, DEFAULT_DCR_STRATEGY } from './dcr-provider-strategy';

/**
 * Per-`mcpId` DCR strategy overrides. Empty by default — register entries here
 * only when a provider needs behavior the generic RFC flow cannot express.
 */
export const dcrProviderStrategyRegistry = new Map<string, DcrProviderStrategy>();

export function resolveDcrProviderStrategy(mcpId: string): DcrProviderStrategy {
  return dcrProviderStrategyRegistry.get(mcpId) ?? DEFAULT_DCR_STRATEGY;
}

export function listRegisteredDcrProviderStrategyIds(): string[] {
  return Array.from(dcrProviderStrategyRegistry.keys());
}
