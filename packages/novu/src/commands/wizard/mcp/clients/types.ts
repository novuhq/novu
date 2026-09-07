import type { ResolvedAuth } from '../../types';
import type { McpServerConfigShape } from '../server-config';

export type McpClientAdapter = {
  /** Stable id used in the picker / store. */
  id: string;
  /** Display label rendered in the picker. */
  label: string;
  /**
   * Returns true when this editor / agent appears installed on the host
   * (config dir present, settings.json exists, etc.). Cheap fs checks only —
   * never spawns subprocesses.
   */
  detect: () => boolean;
  /**
   * Writes the Novu MCP server config into the client's config file. Idempotent:
   * if a `novu` server is already present it overwrites it, leaving any other
   * MCP entries untouched. Returns the absolute path that was written.
   */
  install: (input: { auth: ResolvedAuth; mcpUrlOverride?: string; server: McpServerConfigShape }) => Promise<string>;
};
