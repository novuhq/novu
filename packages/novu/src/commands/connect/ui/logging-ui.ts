import chalk from 'chalk';
import ora, { type Ora } from 'ora';
import type { AgentSummary } from '../types';
import type { ConnectUI, PickResult } from './ui';

export function createLoggingUI(): ConnectUI {
  let spinner: Ora | undefined;
  const stop = () => {
    if (spinner?.isSpinning) spinner.stop();
    spinner = undefined;
  };
  const start = (text: string) => {
    stop();
    spinner = ora({ text, discardStdin: false }).start();
  };
  const succeed = (text: string) => {
    if (spinner) {
      spinner.succeed(text);
      spinner = undefined;
    } else {
      console.log(`${chalk.green('✓')} ${text}`);
    }
  };

  return {
    authStarted() {
      start('Authorizing via the Novu Dashboard…');
    },
    authDashboardUrl(url) {
      if (url) {
        if (spinner) spinner.text = `Authorizing via the Novu Dashboard… ${chalk.gray('(')}${url}${chalk.gray(')')}`;
      }
    },
    authStatus(message) {
      if (spinner) spinner.text = message;
    },
    authCompleted(envName) {
      succeed(envName ? `Authorized for environment "${envName}"` : 'Authorized');
    },
    listingAgents() {
      start('Checking for existing agents…');
    },
    loadingIntegrations() {
      start('Looking up managed integrations…');
    },
    pickExistingOrCreate(_agents) {
      stop();
      // In non-interactive mode we always create a new agent. Users who want
      // to pick an existing one must run interactively.
      console.log(chalk.gray('Non-interactive mode: creating a new agent.'));

      return Promise.resolve<PickResult>({ action: 'new' });
    },
    promptForDescription(defaultPrompt) {
      stop();
      if (typeof defaultPrompt === 'string' && defaultPrompt.trim().length > 0) {
        return Promise.resolve(defaultPrompt);
      }

      return Promise.reject(
        new Error(
          'Non-interactive mode requires --prompt "<agent description>" so the CLI can generate the agent unattended.'
        )
      );
    },
    generatingAgent() {
      start('Generating agent configuration…');
    },
    creatingAgent(name) {
      start(`Creating agent "${name}"…`);
    },
    agentCreated(agent: AgentSummary) {
      succeed(`Created agent "${agent.name}" (${agent.identifier})`);
    },
    addingSlackIntegration() {
      start('Linking Slack to your agent…');
    },
    showSlackOAuthUrl(url) {
      stop();
      console.log(`${chalk.cyan('→')} Authorize Slack here: ${chalk.underline(url)}`);
    },
    pollingForSlackConnection() {
      start('Waiting for Slack authorization…');
    },
    slackConnected() {
      succeed('Slack connected');
    },
    slackSkipped() {
      console.log(chalk.gray('Slack step skipped (--skip-slack).'));
    },
    sendingWelcome() {
      start('Asking your agent to say hello in Slack…');
    },
    success(result) {
      stop();
      const agentUrl = result.environmentSlug
        ? `${result.dashboardUrl}/env/${result.environmentSlug}/agents/${encodeURIComponent(result.agent.identifier)}`
        : `${result.dashboardUrl}/agents/${encodeURIComponent(result.agent.identifier)}`;
      console.log('');
      console.log(`${chalk.green('✓')} Your agent is live.`);
      console.log(`  ${chalk.bold('Agent:')} ${result.agent.name} ${chalk.gray(`(${result.agent.identifier})`)}`);
      if (result.slackConnected) {
        console.log(`  ${chalk.cyan('→')} Check Slack — your agent just messaged you.`);
      } else {
        console.log(`  ${chalk.gray('Slack was not connected.')}`);
      }
      console.log(`  ${chalk.bold('Dashboard:')} ${agentUrl}`);
    },
    failure(message) {
      stop();
      console.error(`${chalk.red('✗')} ${message}`);
    },
    shutdown() {
      stop();

      return Promise.resolve(Number(process.exitCode ?? 0));
    },
  };
}
