import { unlink } from 'node:fs/promises';
import chalk from 'chalk';
import ora, { type Ora } from 'ora';
import type { GeneratedAgentSpec } from '../api/agents';
import { SEND_FROM_ACCOUNT_LABEL } from '../copy/email-onboarding';
import { channelDisplayName } from '../dashboard-urls';
import { resolveChatSdkOutcomeMessage } from '../pipeline/chat-sdk/outcome-message';
import { CHAT_SDK_REQUIREMENTS_FILE_ENV } from '../pipeline/chat-sdk/requirements';
import type { AgentSummary } from '../types';
import { resolveGeneratedAgentSpecLabels } from './agent-spec-labels';
import {
  logAuthUrlFileHandoffEvent,
  logEmailHandoffEvents,
  logSlackHandoffEvents,
  logSlackSetupLinkHandoffEvent,
  logTelegramBotfatherHandoffEvent,
  logTelegramDeepLinkHandoffEvents,
  logTelegramDeepLinkQrPngHandoffEvent,
  logTelegramSetupLinkHandoffEvent,
  logTelegramSetupLinkQrPngHandoffEvent,
  writeAuthUrlHandoffFile,
} from './handoff-events';
import { renderQRPngFile } from './qr';
import type { ConnectUI, GeneratedAgentPreviewResult, PickResult } from './ui';

export function createLoggingUI(): ConnectUI {
  let spinner: Ora | undefined;
  let authUrlLogged = false;
  let authUrlFilePromise: Promise<string | undefined> | undefined;
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
    interactive: false,
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
      if (!url) {
        if (authUrlFilePromise) {
          void authUrlFilePromise.then((filePath) => {
            if (filePath) void unlink(filePath).catch(() => undefined);
          });
          authUrlFilePromise = undefined;
        }

        return;
      }

      if (!authUrlLogged) {
        authUrlLogged = true;
        authUrlFilePromise = writeAuthUrlHandoffFile(url)
          .then((authUrlFile) => {
            logAuthUrlFileHandoffEvent({ authUrlFile });

            return authUrlFile;
          })
          .catch(() => undefined);
      }

      if (spinner) {
        spinner.text =
          'Authorizing via the Novu Dashboard… (read NOVU_CONNECT_AUTH_URL_FILE and deliver the URL to the user)';
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
      start('Looking up agent runtime integrations…');
    },
    pickAgentConnectMode({ preselected }) {
      stop();
      const mode = preselected ?? 'demo';
      console.log(chalk.gray(`Non-interactive mode: using "${mode}" connect mode.`));

      return Promise.resolve(mode);
    },
    pickAgentIntegration({ integrations }) {
      stop();
      if (integrations.length === 1) {
        console.log(chalk.gray(`Non-interactive mode: reusing integration "${integrations[0].name}".`));

        return Promise.resolve({
          kind: 'existing',
          integrationId: integrations[0]._id,
        });
      }

      return Promise.reject(
        new Error(
          'Non-interactive mode: pass --agent-integration-id or BYOK credential flags to create a new integration.'
        )
      );
    },
    promptForSecretInput({ title, verificationError }) {
      stop();
      if (verificationError) {
        console.error(chalk.yellow(`Credentials were rejected: ${verificationError}`));
      }

      return Promise.reject(
        new Error(
          `Non-interactive mode: credential input required for "${title}". Pass the matching --anthropic-api-key or AWS Claude flags.`
        )
      );
    },
    pickAwsClaudeRegion() {
      stop();

      return Promise.reject(new Error('Non-interactive mode: pass --aws-claude-region for AWS Claude managed agents.'));
    },
    verifyingCredentials() {
      start('Verifying credentials…');
    },
    credentialsVerified() {
      succeed('Credentials verified');
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
    refineDescription(previousPrompt) {
      stop();

      return Promise.reject(
        new Error(
          `Non-interactive mode cannot refine the agent description. Original prompt: "${previousPrompt.slice(0, 80)}${previousPrompt.length > 80 ? '…' : ''}"`
        )
      );
    },
    generatingAgent() {
      start('Generating agent configuration…');
    },
    previewGeneratedAgent(spec: GeneratedAgentSpec) {
      stop();
      logGeneratedAgentPreview(spec);

      return Promise.resolve<GeneratedAgentPreviewResult>({
        action: 'confirm',
        spec,
      });
    },
    creatingAgent(name) {
      start(`Creating agent "${name}"…`);
    },
    agentCreated(agent: AgentSummary) {
      succeed(`Created agent "${agent.name}" (${agent.identifier})`);
    },
    promptForAgentName(defaultName) {
      stop();
      const name = defaultName.trim() || 'My Chat SDK Agent';
      console.log(chalk.gray(`Non-interactive mode: using agent name "${name}".`));

      return Promise.resolve(name);
    },
    confirmEnvSecretOverwrite() {
      return Promise.resolve(false);
    },
    confirmScaffold({ projectDir, appName }) {
      console.log(chalk.cyan(`→ Scaffolding Chat SDK app "${appName}" in ${projectDir}`));

      return Promise.resolve(true);
    },
    scaffoldingChatSdk() {
      start('Scaffolding Chat SDK project…');
    },
    chatSdkScaffolded({ projectDir, envPaths }) {
      succeed(`Scaffolded Chat SDK project at ${projectDir}`);
      for (const envPath of envPaths) {
        console.log(chalk.gray(`  Wrote ${envPath}`));
      }
    },
    confirmInstallChatSdkDeps({ projectDir, installCommand, packages }) {
      console.log('');
      console.log(chalk.bold('Install Chat SDK packages?'));
      console.log(chalk.dim(`Adding: ${packages.join(', ')}`));
      console.log(chalk.gray(`  Project: ${projectDir}`));
      console.log(chalk.cyan(`  ${installCommand}`));

      return Promise.resolve(true);
    },
    installingChatSdkDeps() {
      start('Installing Chat SDK packages…');
    },
    showChatSdkReconcilePlan({ projectDir, requirements, envPaths, wiringInstructions, requirementsFile }) {
      succeed('Chat SDK project reconciled');
      console.log(chalk.gray(`  Project: ${projectDir}`));
      for (const req of requirements) {
        const marker =
          req.status === 'ok' ? chalk.green('✓') : req.status === 'manual' ? chalk.yellow('☐') : chalk.cyan('…');
        console.log(`  ${marker} ${req.id}: ${req.detail}`);
      }
      for (const envPath of envPaths) {
        console.log(chalk.gray(`  Env: ${envPath}`));
      }
      if (requirementsFile) {
        console.log(`${CHAT_SDK_REQUIREMENTS_FILE_ENV}=${requirementsFile}`);
      }
      if (wiringInstructions) {
        console.log('');
        console.log(chalk.bold('Code wiring (manual):'));
        console.log(chalk.cyan(wiringInstructions));
      }
      console.log(chalk.gray('Non-interactive mode: continuing automatically.'));

      return Promise.resolve();
    },
    offerChatSdkTunnel({ devCommand }) {
      console.log('');
      console.log(chalk.bold('Start the dev tunnel?'));
      console.log(chalk.cyan(`  ${devCommand}`));
      console.log(chalk.gray('Non-interactive mode: skipping tunnel launch.'));

      return Promise.resolve('skip');
    },
    pickChannel() {
      stop();
      // Non-interactive default: Slack.
      console.log(chalk.gray('Non-interactive mode: defaulting to Slack.'));

      return Promise.resolve('slack');
    },
    awaitDashboardChannelOpen({ channel, agentDetailsUrl }) {
      stop();
      console.log(
        `${chalk.cyan('→')} ${channelDisplayName(channel)} continues in Novu Connect: ${chalk.underline(agentDetailsUrl)}`
      );

      return Promise.resolve();
    },
    addingEmailIntegration() {
      start('Linking Email to your agent…');
    },
    awaitEmailOpen({ inboundAddress, mailtoUrl, sendFromEmail }) {
      stop();
      console.log(`${chalk.cyan('→')} Your agent's inbound address: ${chalk.bold(inboundAddress)}`);
      if (sendFromEmail) {
        console.log(`${chalk.cyan('→')} ${SEND_FROM_ACCOUNT_LABEL} ${chalk.bold(sendFromEmail)}`);
      }
      console.log(`${chalk.cyan('→')} Open in your mail client: ${chalk.underline(mailtoUrl)}`);
      logEmailHandoffEvents({ inboundAddress, mailtoUrl, sendFromEmail });
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
    showTelegramIntro({ botfatherUrl }) {
      stop();
      console.log(`${chalk.cyan('→')} Create a bot with @BotFather: ${chalk.underline(botfatherUrl)}`);
      logTelegramBotfatherHandoffEvent({ botfatherUrl });

      return Promise.resolve();
    },
    pickTelegramTokenDelivery() {
      return Promise.resolve('setup-page');
    },
    showTelegramLinkToken({ mobileUrl }) {
      stop();
      console.log(`${chalk.cyan('→')} Paste your BotFather token on this secure page: ${chalk.underline(mobileUrl)}`);
      logTelegramSetupLinkHandoffEvent({ setupUrl: mobileUrl });
      void renderQRPngFile(mobileUrl)
        .then((setupQrPngPath) => logTelegramSetupLinkQrPngHandoffEvent({ setupQrPngPath }))
        .catch(() => undefined);
    },
    savingTelegramBotToken() {
      start('Saving your Telegram bot token…');
    },
    showTelegramTest({ deepLinkUrl, botUsername }) {
      stop();
      console.log(`${chalk.cyan('→')} Open Telegram and tap Start on @${botUsername}: ${chalk.underline(deepLinkUrl)}`);
      logTelegramDeepLinkHandoffEvents({ deepLinkUrl, botUsername });
      void renderQRPngFile(deepLinkUrl)
        .then((deepLinkQrPngPath) => logTelegramDeepLinkQrPngHandoffEvent({ deepLinkQrPngPath }))
        .catch(() => undefined);
    },
    telegramConnected() {
      succeed('Telegram connected');
    },
    addingSlackIntegration() {
      start('Linking Slack to your agent…');
    },
    showSlackSetupLink({ setupUrl }) {
      stop();
      console.log(
        `${chalk.cyan('→')} Paste your Slack App Configuration Token on this secure page: ${chalk.underline(setupUrl)}`
      );
      logSlackSetupLinkHandoffEvent({ setupUrl });
    },
    promptForSlackConfigToken(_opts) {
      stop();

      return Promise.reject(
        new Error(
          'Slack integration has no OAuth credentials. Omit --slack-config-token to use the secure setup page, or pass the token for headless CI.'
        )
      );
    },
    runningSlackQuickSetup() {
      start('Creating Slack app from manifest…');
    },
    awaitSlackOAuthOpen({ authorizeUrl, appCreated }) {
      stop();
      if (appCreated) {
        console.log(`${chalk.green('✓')} Slack app created successfully.`);
      }
      console.log(`${chalk.cyan('→')} Authorize Slack here: ${chalk.underline(authorizeUrl)}`);
      logSlackHandoffEvents({ authorizeUrl });

      return Promise.resolve();
    },
    showSlackWaiting(_opts) {
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
        ? `${result.connectDashboardUrl}/env/${result.environmentSlug}/connect/agents/${encodeURIComponent(result.agent.identifier)}`
        : `${result.connectDashboardUrl}/connect/agents/${encodeURIComponent(result.agent.identifier)}`;
      const channelLabel = (() => {
        if (result.connectedChannel === 'slack') return 'Slack';
        if (result.connectedChannel === 'telegram') return 'Telegram';
        if (result.connectedChannel === 'email') return 'Email';

        return null;
      })();
      const redirectChannelLabel = result.dashboardRedirectChannel
        ? channelDisplayName(result.dashboardRedirectChannel)
        : null;
      console.log('');
      console.log(`${chalk.green('✓')} Your agent is live.`);
      console.log(`  ${chalk.bold('Agent:')} ${result.agent.name} ${chalk.gray(`(${result.agent.identifier})`)}`);
      if (channelLabel) {
        console.log(`  ${chalk.cyan('→')} Check ${channelLabel} — your agent just messaged you.`);
      } else if (redirectChannelLabel) {
        console.log(
          `  ${chalk.cyan('→')} Finish ${redirectChannelLabel} setup in Novu Connect — we opened it for you.`
        );
      } else {
        console.log(`  ${chalk.gray('No channel connected.')}`);
      }
      if (result.isKeyless && result.claimUrl) {
        console.log(`  ${chalk.bold('Claim your agent:')} ${result.claimUrl}`);
        console.log(`  ${chalk.gray('Sign up to move your agent and conversation into your own account.')}`);
      } else {
        console.log(`  ${chalk.bold('Dashboard:')} ${agentUrl}`);
      }
      if (result.connectMode === 'chat-sdk' && result.chatSdkOutcome) {
        if (result.chatSdkOutcome.scaffolded) {
          console.log(`  ${chalk.bold('Project:')} ${result.chatSdkOutcome.projectDir}`);
          if (result.chatSdkOutcome.skippedInstall) {
            console.log(`  ${chalk.yellow('⚠')} Inside a monorepo — npm install was skipped.`);
            console.log(
              `  ${chalk.cyan('→')} cd ${result.chatSdkOutcome.projectDir} && npm install && npm run dev:novu`
            );
          }
        }

        const followUp = resolveChatSdkOutcomeMessage(result.connectMode, result.chatSdkOutcome);
        if (followUp) {
          console.log(`  ${chalk.cyan('→')} ${followUp}`);
        } else if (!result.chatSdkOutcome.scaffolded && !result.chatSdkOutcome.coreReady) {
          console.log(`  ${chalk.gray('Finish the remaining setup steps above.')}`);
        }
      }
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

function logGeneratedAgentPreview(spec: GeneratedAgentSpec): void {
  const labels = resolveGeneratedAgentSpecLabels(spec);
  const promptPreview = spec.systemPrompt.replace(/\s+/g, ' ').trim().slice(0, 160);

  console.log('');
  console.log(chalk.bold('Generated agent preview'));
  console.log(`  ${chalk.bold('Name:')} ${spec.name} ${chalk.gray(`(${spec.identifier})`)}`);
  console.log(`  ${chalk.bold('System prompt:')} ${promptPreview}${spec.systemPrompt.length > 160 ? '…' : ''}`);
  if (labels.tools.length > 0) {
    console.log(`  ${chalk.bold('Tools:')} ${labels.tools.join(', ')}`);
  }
  if (labels.mcpServers.length > 0) {
    console.log(`  ${chalk.bold('MCP:')} ${labels.mcpServers.join(', ')}`);
  }
  if (labels.skills.length > 0) {
    console.log(`  ${chalk.bold('Skills:')} ${labels.skills.join(', ')}`);
  }
  console.log(chalk.gray('Non-interactive mode: continuing without confirmation.'));
}
