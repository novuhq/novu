import { LISTEN_HOST_IDS, type ListenHostId } from '../api/listen';
import type { HostAdapter } from './host-adapter';

/**
 * The hosts listen can start, each loaded only once it is used, so `connect` and the other commands don't
 * carry them. Codex, OpenCode and Cursor come next (NV-9151); Hermes and OpenClaw start through their own
 * gateways' plugins instead (NV-9152).
 */
const ADAPTERS: Partial<Record<ListenHostId, () => Promise<HostAdapter>>> = {
  'claude-code': async () => (await import('./claude-code')).claudeCode,
};

/** As people see them. */
const NAMES: Record<ListenHostId, string> = {
  'claude-code': 'Claude Code',
  codex: 'Codex',
  opencode: 'OpenCode',
  cursor: 'Cursor',
  hermes: 'Hermes',
  openclaw: 'OpenClaw',
};

export function isListenHostId(value: unknown): value is ListenHostId {
  return typeof value === 'string' && (LISTEN_HOST_IDS as readonly string[]).includes(value);
}

/** A host's name, or the id itself for one this CLI doesn't know yet. */
export function hostNameOf(host: string): string {
  return isListenHostId(host) ? NAMES[host] : host;
}

/** The hosts `listen` can start on this version of the CLI. */
export function startableHosts(): ListenHostId[] {
  return LISTEN_HOST_IDS.filter((id) => ADAPTERS[id]);
}

export async function loadHost(id: ListenHostId): Promise<HostAdapter | null> {
  const load = ADAPTERS[id];

  return load ? load() : null;
}
