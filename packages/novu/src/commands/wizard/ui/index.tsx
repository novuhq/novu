import { render, renderToString } from 'ink';
// biome-ignore lint/correctness/noUnusedImports: required by Cursor's classic-JSX linter (tsconfig.json excludes ui/, so the linter falls back to non-automatic-runtime even though tsconfig.ui.json uses `jsx: react-jsx`).
import React from 'react';
import { createMcpInstaller, type McpInstaller } from '../mcp/installer';
import type { WizardCommandOptions } from '../types';
import { App } from './app';
import { createInkUI } from './ink-ui';
import { createLoggingUI } from './logging-ui';
import { printOutroToStdout } from './print-outro';
import type { WizardServices } from './services';
import { createWizardStore, type WizardStore } from './store';
import type { WizardGoal } from './wizard-session';
import type { WizardUI } from './wizard-ui';

// biome-ignore lint/suspicious/noControlCharactersInRegex: ANSI SGR escapes start with the ESC control character (0x1B); we're explicitly matching that byte here.
const ANSI_SGR_PATTERN = /\u001B\[[0-9;]*m/g;

export type MountInkResult = {
  store: WizardStore;
  ui: WizardUI;
  mcpInstaller: McpInstaller;
  /** Resolves once the Ink instance unmounts (Ctrl+C, services.exit, or screen crash). */
  done: Promise<number>;
};

export type MountWizardUIParams = {
  options: WizardCommandOptions;
  goal: WizardGoal;
  /** Optional installer override — useful for tests. */
  mcpInstaller?: McpInstaller;
};

export function mountWizardUI(params: MountWizardUIParams): MountInkResult {
  const useTui = isInteractiveTty(params.options);
  const store = createWizardStore(params.options, params.goal);
  const mcpInstaller = params.mcpInstaller ?? createMcpInstaller();

  let resolveDone!: (code: number) => void;
  const done = new Promise<number>((resolve) => {
    resolveDone = resolve;
  });

  if (!useTui) {
    const ui = createLoggingUI({
      goal: params.goal,
      debug: !!params.options.debug,
      onShutdown: async () => {
        const exitCode = Number(process.exitCode ?? 0);
        resolveDone(exitCode);

        return exitCode;
      },
    });

    return { store, ui, mcpInstaller, done };
  }

  const services: WizardServices = {
    store,
    mcpInstaller,
    exit: () => {
      // overwritten by `App` once it mounts
    },
  };

  const instance = render(<App services={services} />, {
    patchConsole: false,
    exitOnCtrlC: false,
    alternateScreen: true,
    /**
     * Only re-emit lines that actually changed between frames. Critical for
     * mouse selection: spinner ticks would otherwise rewrite the entire
     * frame (including the dashboard URL line), nuking any active selection.
     */
    incrementalRendering: true,
  });

  /**
   * Re-print the wizard's final visible screen to the regular terminal once
   * Ink has exited the alternate-screen buffer. Without this the entire
   * TUI (header, pipeline progress, outro pane, footer) vanishes the moment
   * Ink unmounts — Ink itself documents that "alternate-screen teardown
   * output is disposable" and is not replayed.
   *
   * Implementation: we render the same `<App />` tree synchronously via
   * `ink.renderToString` (which does NOT touch stdout, terminal modes or
   * input listeners), trim the trailing blank rows that `ScreenContainer`
   * pads to fill the terminal, and write the resulting frame to stdout.
   * The store is still alive at this point, so `useStore` returns the
   * current outro state and the snapshot reflects whatever the user was
   * looking at when they exited.
   *
   * If `renderToString` ever throws — which would only happen if a screen
   * component breaks under Ink's static-render mode — we fall back to the
   * plain-text outro summary so the user still gets *something* useful.
   *
   * Idempotent via `printedSnapshot` so a second unmount path (the
   * `waitUntilExit().then(...)` fallback below) does not double-print.
   */
  let printedSnapshot = false;
  const flushFinalScreenToTerminal = (): void => {
    if (printedSnapshot) return;
    printedSnapshot = true;

    try {
      const frame = renderToString(<App services={services} />, {
        columns: process.stdout.columns || 80,
      });
      const trimmed = trimTrailingBlankLines(frame);
      if (trimmed.length === 0) {
        printOutroToStdout(store.session.get().outroData);

        return;
      }
      process.stdout.write(`\n${trimmed}\n\n`);
    } catch {
      printOutroToStdout(store.session.get().outroData);
    }
  };

  const ui = createInkUI(store, {
    onShutdown: async () => {
      instance.unmount();
      await instance.waitUntilExit();
      flushFinalScreenToTerminal();
      const exitCode = Number(process.exitCode ?? 0);
      resolveDone(exitCode);

      return exitCode;
    },
  });

  void instance.waitUntilExit().then(() => {
    /**
     * Wake up any driver code still awaiting a gate so the runner unblocks
     * and `wizardCommand` can settle. Happens when the user hits Ctrl+C
     * while a gate (e.g. `outro`, `mcp`, `bootstrap`) is still pending.
     * Resolving an already-resolved gate is a no-op, so this is safe to
     * call unconditionally.
     */
    for (const gate of PENDING_GATES) store.getGate(gate).resolve();
    flushFinalScreenToTerminal();
    resolveDone(Number(process.exitCode ?? 0));
  });

  return { store, ui, mcpInstaller, done };
}

const PENDING_GATES = ['bootstrap', 'mcp', 'outro'] as const;

function isInteractiveTty(options: WizardCommandOptions): boolean {
  if (options.ci) return false;
  if (process.env.NOVU_WIZARD_PLAIN === '1' || process.env.NOVU_WIZARD_PLAIN === 'true') return false;
  if (process.env.CI === 'true') return false;
  if (!process.stdout.isTTY) return false;
  if (!process.stdin.isTTY) return false;

  return true;
}

/**
 * Strips trailing rows that contain no visible characters (only spaces and
 * SGR escape sequences). `ScreenContainer` pads the frame to the full
 * terminal height with `overflow="hidden"`, so without trimming the snapshot
 * would dump dozens of blank rows into the user's scrollback after the
 * wizard exits.
 */
function trimTrailingBlankLines(frame: string): string {
  const lines = frame.split('\n');
  while (lines.length > 0) {
    const last = lines[lines.length - 1];
    const visible = last.replace(ANSI_SGR_PATTERN, '').trim();
    if (visible.length > 0) break;
    lines.pop();
  }

  return lines.join('\n');
}
