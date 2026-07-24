import { unlink } from 'node:fs/promises';
import chalk from 'chalk';
import ora, { type Ora } from 'ora';
import type { GeneratedAgentSpec } from '../api/agents';
import { SEND_FROM_ACCOUNT_LABEL } from '../copy/email-onboarding';
import { channelDisplayName } from '../dashboard-urls';
import { printBridgeScaffolded } from '../pipeline/bridge/print-bridge-scaffolded';
import type { BridgeScaffoldVariant } from '../pipeline/bridge/types';
import type { AgentSummary } from '../types';
import { resolveGeneratedAgentSpecLabels } from './agent-spec-labels';
import { installDepsPrompt, installingDepsMessage, reconcilePlanTitle } from './bridge-reconcile-variant';
import {
  logAuthUrlFileHandoffEvent,
  logEmailHandoffEvents,
  logSendblueDashboardHandoffEvent,
  logSendblueImessageHandoffEvents,
  logSendblueWebhookHandoffEvents,
  logSlackHandoffEvents,
  logSlackSetupLinkHandoffEvent,
  logTelegramBotfatherHandoffEvent,
  logTelegramDeepLinkHandoffEvents,
  logTelegramDeepLinkQrPngHandoffEvent,
  logTelegramSetupLinkHandoffEvent,
  logTelegramSetupLinkQrPngHandoffEvent,
  logWhatsAppSignupHandoffEvent,
  logWhatsAppTestHandoffEvents,
  logWhatsAppWaMeQrPngHandoffEvent,
  writeAuthUrlHandoffFile,
} from './handoff-events';
import { printBridgeReconcilePlan } from './print-bridge-reconcile-plan';
import { printConnectSuccess, shouldSkipConnectSuccessSummary } from './print-connect-success';
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
    releaseTerminal() {
      return Promise.resolve();
    },
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
    pickLlmAuthKind() {
      stop();
      console.log(chalk.gray('Non-interactive mode: skipping LLM wiring (demo echo). Pass --llm-auth to configure.'));

      return Promise.resolve('skip');
    },
    confirmScaffold({ projectDir, appName, variant = 'chat-sdk' }) {
      console.log(chalk.cyan(`→ Scaffolding ${bridgeScaffoldLabel(variant)} "${appName}" in ${projectDir}`));

      return Promise.resolve(true);
    },
    scaffoldingBridge({ variant }) {
      start(bridgeScaffoldSpinnerText(variant));
    },
    bridgeScaffolded(opts) {
      stop();
      printBridgeScaffolded(opts);
    },
    confirmInstallBridgeDeps({ projectDir, installCommand, packages, variant = 'chat-sdk' }) {
      console.log('');
      console.log(chalk.bold(installDepsPrompt(variant)));
      console.log(chalk.dim(`Adding: ${packages.join(', ')}`));
      console.log(chalk.gray(`  Project: ${projectDir}`));
      console.log(chalk.cyan(`  ${installCommand}`));

      return Promise.resolve(true);
    },
    installingBridgeDeps(variant = 'chat-sdk') {
      start(installingDepsMessage(variant));
    },
    showBridgeReconcilePlan({
      projectDir,
      requirements,
      envPaths,
      wiringInstructions,
      requirementsFile,
      variant = 'chat-sdk',
    }) {
      succeed(`${reconcilePlanTitle(variant)} reconciled`);
      printBridgeReconcilePlan({ projectDir, requirements, envPaths, wiringInstructions, requirementsFile, variant });
      console.log(chalk.gray('Non-interactive mode: continuing automatically.'));

      return Promise.resolve();
    },
    offerBridgeTunnel({ devCommand }) {
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
    addingSendblueIntegration() {
      start('Linking iMessage (Sendblue) to your agent…');
    },
    showSendblueIntro({ dashboardUrl }) {
      stop();
      console.log(`${chalk.cyan('→')} Sendblue API settings (account required): ${chalk.underline(dashboardUrl)}`);
      logSendblueDashboardHandoffEvent({ dashboardUrl });

      return Promise.resolve();
    },
    promptForSendblueCredential({ title, verificationError }) {
      stop();
      if (verificationError) {
        console.error(chalk.yellow(verificationError));
      }

      return Promise.reject(
        new Error(
          `Non-interactive mode: Sendblue credential "${title}" required. Pass --sendblue-api-key, --sendblue-secret-key and --sendblue-from.`
        )
      );
    },
    configuringSendblueWebhook() {
      start('Registering your Sendblue receive webhook…');
    },
    showSendblueWebhookManualFallback({ callbackUrl, webhookSecret }) {
      stop();
      console.log(`${chalk.yellow('!')} Could not auto-register the Sendblue webhook. Add it manually:`);
      console.log(`  ${chalk.bold('Callback URL:')} ${chalk.underline(callbackUrl)}`);
      if (webhookSecret) {
        console.log(`  ${chalk.bold('Signing secret:')} ${webhookSecret}`);
      }
      logSendblueWebhookHandoffEvents({ callbackUrl, webhookSecret });

      return Promise.resolve();
    },
    promptForSendblueTestPhone() {
      stop();

      return Promise.reject(
        new Error('Non-interactive mode: pass --sendblue-test-phone <+E.164> for the Sendblue test message.')
      );
    },
    sendingSendblueTestMessage() {
      start('Sending a test iMessage…');
    },
    showSendblueTestWaiting({ phone, fromNumber, imessageUrl }) {
      stop();
      console.log(`${chalk.cyan('→')} Test message sent to ${chalk.bold(phone)} from ${chalk.bold(fromNumber)}.`);
      console.log(`${chalk.cyan('→')} Message the bot on iMessage: ${chalk.underline(imessageUrl)}`);
      logSendblueImessageHandoffEvents({ imessageUrl, fromNumber });
      start('Waiting for your first inbound iMessage…');
    },
    sendblueConnected() {
      succeed('iMessage (Sendblue) connected');
    },
    addingWhatsAppIntegration() {
      start('Linking WhatsApp to your agent…');
    },
    awaitWhatsAppSignupOpen({ signupUrl }) {
      stop();
      console.log(`${chalk.cyan('→')} Finish WhatsApp signup here: ${chalk.underline(signupUrl)}`);
      logWhatsAppSignupHandoffEvent({ signupUrl });

      return Promise.resolve();
    },
    showWhatsAppSignupWaiting(_opts) {
      start('Waiting for Meta Embedded Signup to complete…');
    },
    showWhatsAppTest({ waMeUrl, displayPhoneNumber }) {
      stop();
      if (displayPhoneNumber) {
        console.log(`${chalk.cyan('→')} Send any WhatsApp message to ${chalk.bold(displayPhoneNumber)}.`);
      } else {
        console.log(`${chalk.cyan('→')} Send any WhatsApp message to your business number.`);
      }
      if (waMeUrl) {
        console.log(`${chalk.cyan('→')} Open WhatsApp directly: ${chalk.underline(waMeUrl)}`);
      }
      logWhatsAppTestHandoffEvents({ waMeUrl, displayPhoneNumber });
      if (waMeUrl) {
        void renderQRPngFile(waMeUrl)
          .then((waMeQrPngPath) => logWhatsAppWaMeQrPngHandoffEvent({ waMeQrPngPath }))
          .catch(() => undefined);
      }
      start('Waiting for your first inbound WhatsApp message…');
    },
    whatsappConnected() {
      succeed('WhatsApp connected');
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
      if (shouldSkipConnectSuccessSummary(result)) {
        return;
      }

      printConnectSuccess(result);
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

function bridgeScaffoldLabel(variant: BridgeScaffoldVariant): string {
  if (variant === 'chat-sdk') {
    return 'Chat SDK app';
  }

  if (variant === 'ai-sdk') {
    return 'AI SDK agent app';
  }

  if (variant === 'langchain') {
    return 'LangChain agent app';
  }

  return 'agent app';
}

function bridgeScaffoldSpinnerText(variant: BridgeScaffoldVariant): string {
  if (variant === 'chat-sdk') {
    return 'Scaffolding Chat SDK project…';
  }

  if (variant === 'ai-sdk') {
    return 'Scaffolding AI SDK agent project…';
  }

  if (variant === 'langchain') {
    return 'Scaffolding LangChain agent project…';
  }

  return 'Scaffolding agent project…';
}
