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
    showWelcome() {
      // Non-interactive: skip the welcome prompt; the run is unattended by
      // definition (--ci or piped stdin) so there's nobody to press Enter.
      stop();
      console.log(chalk.bold('Welcome to Novu Connect.'));
      console.log(chalk.gray('Authorizing automatically (non-interactive mode).'));

      return Promise.resolve();
    },
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
    pickChannel() {
      stop();
      // Non-interactive default: Slack.
      console.log(chalk.gray('Non-interactive mode: defaulting to Slack.'));

      return Promise.resolve('slack');
    },
    channelComingSoon(choice) {
      stop();
      console.log(`${chalk.yellow('!')} ${choice} is coming soon — set it up in the dashboard for now.`);
    },
    addingEmailIntegration() {
      start('Linking Email to your agent…');
    },
    awaitEmailOpen({ inboundAddress, mailtoUrl }) {
      stop();
      console.log(`${chalk.cyan('→')} Your agent's inbound address: ${chalk.bold(inboundAddress)}`);
      console.log(`${chalk.cyan('→')} Open in your mail client: ${chalk.underline(mailtoUrl)}`);
      // Non-interactive: nothing to await — the user will copy/paste the
      // address themselves. Resolve immediately so the pipeline can move on
      // to polling.
      return Promise.resolve();
    },
    showEmailWaiting({ inboundAddress }) {
      start(`Waiting for your email at ${inboundAddress}…`);
    },
    emailConnected() {
      succeed('Email connected');
    },
    addingTelegramIntegration() {
      start('Linking Telegram to your agent…');
    },
    showTelegramIntro(_opts) {
      stop();

      return Promise.reject(
        new Error(
          'Telegram setup is interactive only (3 QR scans). Run `npx novu connect` without --ci to walk through it.'
        )
      );
    },
    showTelegramLinkToken({ mobileUrl }) {
      stop();
      console.log(`${chalk.cyan('→')} Open on your phone to paste the bot token: ${chalk.underline(mobileUrl)}`);
    },
    showTelegramTest({ deepLinkUrl, botUsername }) {
      stop();
      console.log(`${chalk.cyan('→')} Open Telegram and tap Start on @${botUsername}: ${chalk.underline(deepLinkUrl)}`);
    },
    telegramConnected() {
      succeed('Telegram connected');
    },
    addingSlackIntegration() {
      start('Linking Slack to your agent…');
    },
    promptForSlackConfigToken(_opts) {
      stop();

      return Promise.reject(
        new Error(
          'Slack integration has no OAuth credentials. Pass --slack-config-token "xoxe.xoxp-…" to run the Slack quick-setup unattended, or run interactively to paste it.'
        )
      );
    },
    runningSlackQuickSetup() {
      start('Creating Slack app from manifest…');
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
      const channelLabel =
        result.connectedChannel === 'slack'
          ? 'Slack'
          : result.connectedChannel === 'telegram'
            ? 'Telegram'
            : null;
      console.log('');
      console.log(`${chalk.green('✓')} Your agent is live.`);
      console.log(`  ${chalk.bold('Agent:')} ${result.agent.name} ${chalk.gray(`(${result.agent.identifier})`)}`);
      if (channelLabel) {
        console.log(`  ${chalk.cyan('→')} Check ${channelLabel} — your agent just messaged you.`);
      } else {
        console.log(`  ${chalk.gray('No channel connected.')}`);
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
