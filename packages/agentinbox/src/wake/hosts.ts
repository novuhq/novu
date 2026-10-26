import { WAKE_HOST_IDS, type WakeHostId } from '../api/wake';
import type { HostAdapter } from './host-adapter';

/**
 * The hosts wake can start, each loaded only once it is used, so `connect` and the other commands don't
 * carry them. Codex, OpenCode and Cursor come next (NV-9151); Hermes and OpenClaw wake through their own
 * gateways' plugins instead (NV-9152).
 */
const ADAPTERS: Partial<Record<WakeHostId, () => Promise<HostAdapter>>> = {
  'claude-code': async () => (await import('./claude-code')).claudeCode,
};

/** As people see them. */
const NAMES: Record<WakeHostId, string> = {
  'claude-code': 'Claude Code',
  codex: 'Codex',
  opencode: 'OpenCode',
  cursor: 'Cursor',
  hermes: 'Hermes',
  openclaw: 'OpenClaw',
};

export function isWakeHostId(value: unknown): value is WakeHostId {
  return typeof value === 'string' && (WAKE_HOST_IDS as readonly string[]).includes(value);
}

/** A host's name, or the id itself for one this CLI doesn't know yet. */
export function wakeHostName(host: string): string {
  return isWakeHostId(host) ? NAMES[host] : host;
}

/** The hosts `wake` can start on this version of the CLI. */
export function wakeableHosts(): WakeHostId[] {
  return WAKE_HOST_IDS.filter((id) => ADAPTERS[id]);
}

export async function loadHost(id: WakeHostId): Promise<HostAdapter | null> {
  const load = ADAPTERS[id];

  return load ? load() : null;
}
