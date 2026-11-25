import { LISTEN_HOST_IDS, type ListenHostId } from '../api/listen';
import type { HostAdapter } from './host-adapter';

/**
 * The hosts listen can start, each loaded only once it is used, so `connect` and the other commands don't
 * carry them. Hermes and OpenClaw listen through Agent Inbox's plugin for their own gateway instead
 * (`GATEWAY_PLUGINS`).
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

/**
 * How to install a gateway's plugin and connect it. `agentInstall` is the install an agent runs, when that differs:
 * nobody is at its terminal to answer what the host asks while it installs.
 */
export type GatewayPlugin = { install: string; agentInstall?: string; setup: string; restart: string };

/**
 * The hosts whose gateway listens itself, with Agent Inbox's plugin for it: how to install it and connect it. A
 * one-time code from agentinbox.md connects it, as it connects this CLI.
 */
export const GATEWAY_PLUGINS: Partial<Record<ListenHostId, GatewayPlugin>> = {
  hermes: {
    // From Hermes's plugin catalog: the commit its maintainers reviewed, as the catalog pins it.
    install: 'hermes plugins install agentinbox --enable',
    setup: 'hermes agentinbox setup <agent> --code <code>',
    restart: 'hermes gateway restart',
  },
  openclaw: {
    install: 'openclaw plugins install clawhub:@agentinbox/openclaw',
    // OpenClaw asks the person at the terminal to agree to what the plugin may do; an agent agrees ahead.
    agentInstall: 'openclaw plugins install clawhub:@agentinbox/openclaw --accept-capabilities',
    setup: 'openclaw agentinbox setup <agent> --code <code>',
    restart: 'openclaw gateway restart',
  },
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
