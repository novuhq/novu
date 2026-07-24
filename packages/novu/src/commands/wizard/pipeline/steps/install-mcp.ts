import { mapSkillHostsToMcpClientIds } from '../../mcp/clients';
import type { McpInstaller } from '../../mcp/installer';
import type { SkillHost } from '../../skills/install-skills';
import type { ResolvedAuth, WizardCommandOptions } from '../../types';
import type { WizardStore } from '../../ui/store';
import type { McpInstallResult } from '../../ui/wizard-session';
import type { WizardUI } from '../../ui/wizard-ui';

export interface RunInstallMcpStepInput {
  ui: WizardUI;
  store: WizardStore;
  installer: McpInstaller;
  auth: ResolvedAuth;
  options: WizardCommandOptions;
  /**
   * Hosts resolved upstream by the same detector the skills installer uses
   * (`resolveWizardRuntimeSkillHosts`). When `autoSelect` is true the step
   * fans out across every host that maps to a known MCP client adapter; one
   * MCP server config is written per editor. When `undefined` the step
   * falls back to "first detected client wins" — preserves behaviour for
   * any caller that hasn't been migrated yet.
   */
  hosts?: readonly SkillHost[];
  /**
   * When true (the default), no UI prompt — the step installs into every
   * MCP client mapped from `hosts` (or the first detected client when
   * `hosts` is omitted) and returns. The wizard runner now ALWAYS passes
   * `true` because MCP install runs concurrently with auth / install /
   * skills inside the pre-agent parallel block (see `pipeline/runner.ts`);
   * blocking on a user prompt would defeat the parallelism. The flag
   * remains so callers (tests, future programmatic uses) can opt back into
   * the interactive picker.
   */
  autoSelect?: boolean;
}

export async function runInstallMcpStep(input: RunInstallMcpStepInput): Promise<void> {
  const { ui, store, installer, auth, options, hosts, autoSelect = true } = input;
  const candidates = installer.detect();
  ui.setMcpCandidates(candidates);

  if (autoSelect) {
    const targets = resolveAutoSelectTargets(hosts, candidates);
    if (targets.length === 0) {
      ui.pushStatus('No editor with MCP support detected — skipping MCP install.', 'warn');
      ui.finishMcpInstalls(true);

      return;
    }

    for (const clientId of targets) {
      store.setMcpSelection(clientId);
      await runInstall(clientId, ui, installer, auth, options);
    }
    // Phase resolves to `done` / `error` based on whether any install
    // appended to `mcp.installed` (handled inside `finishMcpInstalls`).
    ui.finishMcpInstalls(false);

    return;
  }

  // Interactive (legacy / opt-in): the Mcp screen calls
  // `store.getGate('mcp').resolve()` after the user picks (or skips) a
  // client. The screen also writes the selection into
  // `store.session.mcp.selectedClientId`.
  await ui.awaitMcpGate();
  const selection = store.session.get().mcp.selectedClientId;
  if (!selection) {
    ui.finishMcpInstalls(true);

    return;
  }
  await runInstall(selection, ui, installer, auth, options);
  ui.finishMcpInstalls(false);
}

/**
 * Picks the MCP clients to install into when in `autoSelect` mode. We prefer
 * the host-mapped fan-out because it lines up 1:1 with the skill-host list
 * — the user gets a Novu MCP server in every editor that also got Novu
 * skills. We additionally intersect with `installer.detect()` so we never
 * write MCP config into editors the user does not actually have on disk.
 *
 * When the caller does not supply `hosts` (legacy entry points, tests) we
 * keep the previous "first detected client" behaviour as a soft fallback.
 */
function resolveAutoSelectTargets(
  hosts: readonly SkillHost[] | undefined,
  candidates: ReturnType<McpInstaller['detect']>
): string[] {
  const detectedIds = new Set(candidates.filter((c) => c.detected).map((c) => c.id));

  if (hosts && hosts.length > 0) {
    const mapped = mapSkillHostsToMcpClientIds(hosts);
    const present = mapped.filter((id) => detectedIds.has(id));
    if (present.length > 0) return present;
  }

  const first = candidates.find((c) => c.detected);

  return first ? [first.id] : [];
}

async function runInstall(
  clientId: string,
  ui: WizardUI,
  installer: McpInstaller,
  auth: ResolvedAuth,
  options: WizardCommandOptions
): Promise<McpInstallResult | null> {
  try {
    const result = await installer.install(clientId, { auth, mcpUrlOverride: options.mcpUrl });
    ui.addMcpInstall(result);
    ui.pushStatus(`Installed Novu MCP into ${result.clientLabel} (${result.configPath})`, 'ok');

    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    ui.pushStatus(`MCP install into ${clientId} failed: ${message}`, 'error');

    return null;
  }
}
