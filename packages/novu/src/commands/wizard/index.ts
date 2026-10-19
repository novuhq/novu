import path from 'node:path';
import { pathToFileURL } from 'node:url';
import chalk from 'chalk';
import { AnalyticService } from '../../services/analytics.service';
import { trackWizard, WIZARD_EVENTS } from './analytics/events';
import { createMcpInstaller } from './mcp/installer';
import { runWizardPipeline } from './pipeline/runner';
import type { WizardCommandOptions } from './types';
import { createLoggingUI } from './ui/logging-ui';
import { createWizardStore } from './ui/store';
import type { WizardGoal } from './ui/wizard-session';

const analytics = new AnalyticService();

interface MountResult {
  ui: ReturnType<typeof createLoggingUI>;
  store: ReturnType<typeof createWizardStore>;
  mcpInstaller: ReturnType<typeof createMcpInstaller>;
  done: Promise<number>;
}

interface UiBundle {
  mountWizardUI: (params: { options: WizardCommandOptions; goal: WizardGoal }) => MountResult;
}

const dynamicImport = new Function('specifier', 'return import(specifier)') as (specifier: string) => Promise<unknown>;

async function loadInkUi(): Promise<UiBundle> {
  const bundlePath = path.join(__dirname, 'ui', 'index.mjs');
  try {
    const url = pathToFileURL(bundlePath).href;

    return (await dynamicImport(url)) as UiBundle;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to load Novu Wizard UI bundle from ${bundlePath}. Underlying error: ${message}`);
  }
}

export async function wizardCommand(options: WizardCommandOptions, anonymousId?: string): Promise<void> {
  const goal: WizardGoal = options.goal ?? 'full';

  trackWizard(analytics, anonymousId, WIZARD_EVENTS.STARTED, {
    region: options.region,
    apiUrl: options.apiUrl,
    yes: !!options.yes,
    ci: !!options.ci,
    goal,
  });

  let exitCode = 0;
  try {
    if (shouldUseLoggingMode(options)) {
      const store = createWizardStore(options, goal);
      const mcpInstaller = createMcpInstaller();
      const ui = createLoggingUI({
        goal,
        debug: !!options.debug,
        onShutdown: async () => Number(process.exitCode ?? 0),
      });

      const result = await runWizardPipeline({
        options,
        goal,
        ui,
        store,
        mcpInstaller,
        onTrack: (event, data) => trackWizard(analytics, anonymousId, event as never, data ?? {}),
      });
      exitCode = result.exitCode;
    } else {
      const { mountWizardUI } = await loadInkUi();
      const mounted = mountWizardUI({ options, goal });
      const result = await runWizardPipeline({
        options,
        goal,
        ui: mounted.ui as never,
        store: mounted.store as never,
        mcpInstaller: mounted.mcpInstaller as never,
        onTrack: (event, data) => trackWizard(analytics, anonymousId, event as never, data ?? {}),
      });
      exitCode = (await mounted.done) || result.exitCode;
    }

    trackWizard(analytics, anonymousId, WIZARD_EVENTS.COMPLETED, { exitCode });

    if (exitCode !== 0) process.exitCode = exitCode;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    trackWizard(analytics, anonymousId, WIZARD_EVENTS.ERROR, { message });
    console.error(chalk.red(`Wizard failed: ${message}`));
    process.exitCode = 1;
  } finally {
    await analytics.flush();
  }
}

function shouldUseLoggingMode(options: WizardCommandOptions): boolean {
  if (options.ci) return true;
  if (process.env.NOVU_WIZARD_PLAIN === '1' || process.env.NOVU_WIZARD_PLAIN === 'true') return true;
  if (process.env.CI === 'true') return true;
  if (!process.stdout.isTTY) return true;

  return false;
}
