import chalk from 'chalk';
import { AnalyticService } from '../../services/analytics.service';
import { runAgent } from './agent/run';
import { ENVOY_EVENTS, trackEnvoy } from './analytics/events';
import { resolveAuth } from './auth/resolve-auth';
import { detectProject } from './context/detect-project';
import { gatherIntent } from './context/gather-intent';
import { detectSkillHosts, installSkills, SkillHost } from './skills/install-skills';
import { EnvoyCommandOptions } from './types';

const analytics = new AnalyticService();

export async function envoyCommand(options: EnvoyCommandOptions, anonymousId?: string): Promise<void> {
  printBanner();
  trackEnvoy(analytics, anonymousId, ENVOY_EVENTS.STARTED, {
    region: options.region,
    apiUrl: options.apiUrl,
    yes: !!options.yes,
  });

  try {
    const auth = await resolveAuth(options);
    trackEnvoy(analytics, anonymousId, ENVOY_EVENTS.AUTH_COMPLETED, { source: auth.source });

    const project = detectProject(process.cwd());
    const intent = await gatherIntent(!!options.yes);

    const detectedHosts = detectSkillHosts(process.cwd());
    const skillHosts: SkillHost[] = detectedHosts.length > 0 ? detectedHosts : ['claude', 'cursor'];
    const { installed, officialFetched, officialError, officialBranch } = installSkills(process.cwd(), {
      hosts: skillHosts,
      officialBranch: options.skillsBranch,
    });
    if (installed.length > 0) {
      const hosts = Array.from(new Set(installed.map((skill) => skill.host)));
      const destinations = hosts
        .map((host) => (host === 'claude' ? '.claude/skills/novu/' : '.cursor/skills/novu/'))
        .join(' and ');
      console.log(chalk.gray(`Installed ${installed.length} Novu skill files under ${destinations}`));
      if (!officialFetched && officialError) {
        console.log(chalk.gray(`  Some skills may not be available: ${officialError}`));
      }
    }

    trackEnvoy(analytics, anonymousId, ENVOY_EVENTS.STEP, {
      step: 'agent-start',
      framework: project.framework,
      goal: intent.goal,
      preferDashboardWorkflows: intent.preferDashboardWorkflows,
    });

    const summary = await runAgent({ options, auth, project, intent });

    trackEnvoy(analytics, anonymousId, ENVOY_EVENTS.COMPLETED, {
      totalMessages: summary.totalMessages,
      toolCalls: summary.toolCalls,
      errors: summary.errors,
    });

    if (options.print) {
      console.log(JSON.stringify({ ok: true, summary }));
    } else {
      console.log(chalk.green('\n✔ Novu Envoy session complete.'));
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (isCancellation(error)) {
      trackEnvoy(analytics, anonymousId, ENVOY_EVENTS.CANCELLED, { message });
      console.log(chalk.yellow('Envoy cancelled.'));

      return;
    }

    trackEnvoy(analytics, anonymousId, ENVOY_EVENTS.ERROR, { message });
    console.error(chalk.red(`Envoy failed: ${friendlyErrorMessage(message)}`));
    process.exitCode = 1;
  } finally {
    await analytics.flush();
  }
}

function printBanner(): void {
  console.log(
    chalk.cyan(`
  ╭───────────────────────────────────────────────╮
  │   Novu Envoy ${chalk.gray('(beta)')}          │
  │   AI-assisted Novu integration wizard         │
  ╰───────────────────────────────────────────────╯
`)
  );
}

function isCancellation(error: unknown): boolean {
  if (!error) return false;
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = String((error as { message: unknown }).message ?? '').toLowerCase();

    return message.includes('cancel') || message.includes('aborted');
  }

  return false;
}

function friendlyErrorMessage(message: string): string {
  if (message.includes('403')) {
    return 'Novu Envoy is currently in private beta for enterprise customers — reach out to your Novu CSM to enable it.';
  }
  if (message.includes('404')) {
    return 'Novu Envoy is not available on this Novu deployment. Make sure you are pointed at a Novu Cloud or enterprise instance with the LLM Gateway enabled.';
  }

  return message;
}
