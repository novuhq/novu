/**
 * Action-id grammar for `ctx.approve` / `ctx.ask` / `ctx.choose` cards.
 * Matches the API `human:*` parser. When `renderApprove` is used, the
 * identifier is the client-minted `requestId` (`hr_…`) when a HITL `render*`
 * helper is used; the default chrome path still uses the public `hi_…` id.
 */

const PREFIX = 'human:';

export function buildHumanApproveActionId(identifier: string): string {
  return `${PREFIX}${identifier}:approve`;
}

export function buildHumanDenyActionId(identifier: string): string {
  return `${PREFIX}${identifier}:deny`;
}

export function buildHumanOptionActionId(identifier: string, optionId: string): string {
  return `${PREFIX}${identifier}:opt:${optionId}`;
}
