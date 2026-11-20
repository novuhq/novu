import { LISTEN_HOST_IDS, type ListenHostId } from '../api/listen';
import type { HostAdapter } from './host-adapter';

/**
 * The hosts listen can start, each loaded only once it is used, so `connect` and the other commands don't
 * carry them. Hermes and OpenClaw start through their own gateways' plugins instead (NV-9152).
 */
const ADAPTERS: Partial<Record<ListenHostId, () => Promise<HostAdapter>>> = {
  'claude-code': async () => (await import('./claude-code')).claudeCode,
  codex: async () => (await import('./codex')).codex,
  opencode: async () => (await import('./opencode')).opencode,
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

/** Hosts by name, as a sentence lists them: "Claude Code, Codex and OpenCode". */
export function hostNames(hosts: readonly string[]): string {
  const names = hosts.map(hostNameOf);

  return names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}` : (names[0] ?? '');
}

/** The hosts `listen` can start on this version of the CLI. */
export function startableHosts(): ListenHostId[] {
  return LISTEN_HOST_IDS.filter((id) => ADAPTERS[id]);
}

export async function loadHost(id: ListenHostId): Promise<HostAdapter | null> {
  const load = ADAPTERS[id];

  return load ? load() : null;
}
