import type { McpInstaller } from '../../mcp/installer';
import type { ResolvedAuth, WizardCommandOptions } from '../../types';
import type { WizardStore } from '../../ui/store';
import type { WizardUI } from '../../ui/wizard-ui';

export interface RunInstallMcpStepInput {
  ui: WizardUI;
  store: WizardStore;
  installer: McpInstaller;
  auth: ResolvedAuth;
  options: WizardCommandOptions;
  /**
   * When true, no UI prompt — installs into the first detected client (or
   * skips when none). Set automatically by `--yes` and `--ci`.
   */
  autoSelect: boolean;
}

export async function runInstallMcpStep(input: RunInstallMcpStepInput): Promise<void> {
  const { ui, store, installer, auth, options, autoSelect } = input;
  const candidates = installer.detect();
  ui.setMcpCandidates(candidates);

  if (autoSelect) {
    const first = candidates.find((c) => c.detected) ?? null;
    if (!first) {
      ui.pushStatus('No editor with MCP support detected — skipping MCP install.', 'warn');
      ui.setMcpInstalled(null, true);

      return;
    }
    store.setMcpSelection(first.id);
    await runInstall(first.id, ui, installer, auth, options);

    return;
  }

  // Interactive: the Mcp screen calls `store.getGate('mcp').resolve()` after
  // the user picks (or skips) a client. The screen also writes the selection
  // into `store.session.mcp.selectedClientId`.
  await ui.awaitMcpGate();
  const selection = store.session.get().mcp.selectedClientId;
  if (!selection) {
    ui.setMcpInstalled(null, true);

    return;
  }
  await runInstall(selection, ui, installer, auth, options);
}

async function runInstall(
  clientId: string,
  ui: WizardUI,
  installer: McpInstaller,
  auth: ResolvedAuth,
  options: WizardCommandOptions
): Promise<void> {
  try {
    const result = await installer.install(clientId, { auth, mcpUrlOverride: options.mcpUrl });
    ui.setMcpInstalled(result, false);
    ui.pushStatus(`Installed Novu MCP into ${result.clientLabel} (${result.configPath})`, 'ok');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    ui.pushStatus(`MCP install failed: ${message}`, 'error');
    ui.setMcpInstalled(null, false);
  }
}
