/**
 * Action-id grammar for human-interaction cards. Kept distinct from
 * `tool-approval:*` / `mcp-approval:*` so `parseToolApprovalActionId` and the
 * human parser can never claim each other's clicks.
 *
 *   human:<identifier>:approve        approve verdict
 *   human:<identifier>:deny           deny verdict
 *   human:<identifier>:opt:<optionId> choose pick
 *   human:pick:<identifier>:<answerId>  disambiguation pick ("which question?")
 */

const PREFIX = 'human:';
const PICK_PREFIX = 'human:pick:';

export type HumanActionParsed =
  | { type: 'approve' | 'deny'; identifier: string }
  | { type: 'option'; identifier: string; optionId: string }
  | { type: 'disambiguation-pick'; identifier: string; answerId?: string };

export function buildHumanApproveActionId(identifier: string): string {
  return `${PREFIX}${identifier}:approve`;
}

export function buildHumanDenyActionId(identifier: string): string {
  return `${PREFIX}${identifier}:deny`;
}

export function buildHumanOptionActionId(identifier: string, optionId: string): string {
  return `${PREFIX}${identifier}:opt:${optionId}`;
}

export function buildHumanDisambiguationActionId(identifier: string, answerId: string): string {
  return `${PICK_PREFIX}${identifier}:${answerId}`;
}

export function parseHumanActionId(actionId: string | undefined): HumanActionParsed | null {
  if (!actionId?.startsWith(PREFIX)) {
    return null;
  }

  if (actionId.startsWith(PICK_PREFIX)) {
    const rest = actionId.slice(PICK_PREFIX.length);
    if (!rest) {
      return null;
    }

    const separator = rest.indexOf(':');
    if (separator <= 0) {
      return { type: 'disambiguation-pick', identifier: rest };
    }

    const identifier = rest.slice(0, separator);
    const answerId = rest.slice(separator + 1);

    return identifier && answerId ? { type: 'disambiguation-pick', identifier, answerId } : null;
  }

  const rest = actionId.slice(PREFIX.length);
  const firstColon = rest.indexOf(':');
  if (firstColon <= 0) {
    return null;
  }

  const identifier = rest.slice(0, firstColon);
  const verb = rest.slice(firstColon + 1);

  if (verb === 'approve' || verb === 'deny') {
    return { type: verb, identifier };
  }

  if (verb.startsWith('opt:')) {
    const optionId = verb.slice('opt:'.length);

    return optionId ? { type: 'option', identifier, optionId } : null;
  }

  return null;
}
