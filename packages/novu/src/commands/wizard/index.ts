import path from 'node:path';
import { pathToFileURL } from 'node:url';
import chalk from 'chalk';
import { AnalyticService } from '../../services/analytics.service';
import { trackWizard, WIZARD_EVENTS } from './analytics/events';
import type { WizardCommandOptions } from './types';
import { runPlainWizard } from './ui/fallback-renderer';
import type { MountInkAppParams, MountInkAppResult } from './ui/types';

const analytics = new AnalyticService();

export async function wizardCommand(options: WizardCommandOptions, anonymousId?: string): Promise<void> {
  trackWizard(analytics, anonymousId, WIZARD_EVENTS.STARTED, {
    region: options.region,
    apiUrl: options.apiUrl,
    yes: !!options.yes,
  });

  const params: MountInkAppParams = {
    options,
    anonymousId,
    onTrack: (event, data) => trackWizard(analytics, anonymousId, event as never, data ?? {}),
  };

  let result: MountInkAppResult = { exitCode: 0, summary: { totalMessages: 0, toolCalls: 0, errors: 0 } };

  try {
    if (shouldUsePlainText(options)) {
      result = await runPlainWizard(params);
    } else {
      const { mountInkApp } = await loadInkUi();
      result = await mountInkApp(params);
    }

    trackWizard(analytics, anonymousId, WIZARD_EVENTS.COMPLETED, {
      totalMessages: result.summary.totalMessages,
      toolCalls: result.summary.toolCalls,
      errors: result.summary.errors,
    });

    if (result.exitCode !== 0) process.exitCode = result.exitCode;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    trackWizard(analytics, anonymousId, WIZARD_EVENTS.ERROR, { message });
    console.error(chalk.red(`Wizard failed: ${message}`));
    process.exitCode = 1;
  } finally {
    await analytics.flush();
  }
}

function shouldUsePlainText(options: WizardCommandOptions): boolean {
  if (options.print) return true;
  if (process.env.NOVU_WIZARD_PLAIN === '1' || process.env.NOVU_WIZARD_PLAIN === 'true') return true;
  if (!process.stdout.isTTY) return true;

  return false;
}

interface UiBundle {
  mountInkApp: (params: MountInkAppParams) => Promise<MountInkAppResult>;
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
