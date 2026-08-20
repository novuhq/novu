import chalk from 'chalk';
import { render } from 'ink';
// biome-ignore lint/correctness/noUnusedImports: classic-JSX linter falls back here because tsconfig.json excludes ui/.
import React from 'react';
import type { GeneratedAgentSpec } from '../api/agents';
import { ConnectChannelBackError } from '../errors';
import { printBridgeScaffolded } from '../pipeline/bridge/print-bridge-scaffolded';
import type { LlmAuthKind } from '../pipeline/llm-auth/types';
import { restoreStdinForConsole } from '../restore-stdin-for-console';
import type { AgentSummary, ConnectCommandOptions } from '../types';
import { App } from './app';
import { promptBridgeReconcilePlanInConsole, promptBridgeTunnelInConsole } from './console-bridge-reconcile-prompts';
import {
  promptConfirmInstallBridgeDepsInConsole,
  promptConfirmScaffoldInConsole,
} from './console-bridge-scaffold-prompts';
import { printConnectSuccess, shouldSkipConnectSuccessSummary } from './print-connect-success';
import { createPendingInteractionRegistry, type PendingInteractionRegistry } from './register-pending-interaction';
import { type ConnectStore, createConnectStore } from './store';
import type {
  BridgeTunnelOfferResult,
  ConnectUI,
  GeneratedAgentPreviewResult,
  PickResult,
  TelegramTokenDelivery,
} from './ui';

export interface MountConnectUIParams {
  options: ConnectCommandOptions;
}

export interface MountConnectUIResult {
  ui: ConnectUI;
  done: Promise<number>;
}

export function mountConnectUI(_params: MountConnectUIParams): MountConnectUIResult {
  const store = createConnectStore();
  let exitInk: (() => void) | undefined;
  let terminalReleased = false;
  let doneResolved = false;
  const pendingInteraction = createPendingInteractionRegistry();
  let resolveDone!: (code: number) => void;
  const done = new Promise<number>((resolve) => {
    resolveDone = resolve;
  });

  const resolveDoneOnce = (code: number) => {
    if (doneResolved) {
      return;
    }

    doneResolved = true;
    resolveDone(code);
  };

  const instance = render(
    <App
      store={store}
      registerExit={(fn) => {
        exitInk = fn;
      }}
    />,
    {
      patchConsole: false,
      exitOnCtrlC: false,
      /**
       * Full redraw each frame. Incremental mode (~10 fps orb + arrow-key menu)
       * corrupts Ink's cursor tracking and duplicates channel picker rows.
       * Copyable URL phases pause the orb so URL lines are not redrawn every frame.
       */
      incrementalRendering: false,
      // No alternate-screen here: the connect flow is short and we want the
      // final success message to remain visible in scrollback after exit.
    }
  );

  void instance.waitUntilExit().then(() => {
    if (terminalReleased) {
      return;
    }

    pendingInteraction.cancel();
    resolveDoneOnce(Number(process.exitCode ?? 0));
  });

  const releaseTerminal = async () => {
    if (terminalReleased) return;
    terminalReleased = true;
    exitInk?.();
    await instance.waitUntilExit();
    restoreStdinForConsole();
    console.log('');
  };

  let embedSuccessDismissWait: Promise<void> | undefined;

  const shutdown = async () => {
    if (terminalReleased) {
      const exitCode = Number(process.exitCode ?? 0);
      resolveDoneOnce(exitCode);

      return exitCode;
    }

    if (embedSuccessDismissWait) {
      await embedSuccessDismissWait;
      embedSuccessDismissWait = undefined;
    }

    // Hold the final frame (error or success) on screen long enough for the
    // user to read it before Ink tears down. Without this, the App re-renders
    // with the new phase and then unmounts in the same microtask — the user
    // sees only the previous spinner and a blank line.
    const finalPhase = store.phase.get().kind;
    const holdMs = finalPhase === 'error' ? 1500 : finalPhase === 'success' ? 200 : 50;
    await new Promise<void>((resolve) => setTimeout(resolve, holdMs));
    exitInk?.();
    await instance.waitUntilExit();
    const exitCode = Number(process.exitCode ?? 0);
    resolveDoneOnce(exitCode);

    return exitCode;
  };

  const ui = createUiController(store, {
    shutdown,
    releaseTerminal,
    isTerminalReleased: () => terminalReleased,
    pendingInteraction,
    setEmbedSuccessDismissWait: (wait) => {
      embedSuccessDismissWait = wait;
    },
  });

  return { ui, done };
}

function createUiController(
  store: ConnectStore,
  ctx: {
    shutdown: () => Promise<number>;
    releaseTerminal: () => Promise<void>;
    isTerminalReleased: () => boolean;
    pendingInteraction: PendingInteractionRegistry;
    setEmbedSuccessDismissWait: (wait: Promise<void> | undefined) => void;
  }
): ConnectUI {
  const offerBridgeTunnelImpl = ({
    projectDir,
    devCommand,
  }: {
    projectDir: string;
    devCommand: string;
  }): Promise<BridgeTunnelOfferResult> => {
    if (ctx.isTerminalReleased()) {
      return promptBridgeTunnelInConsole({ projectDir, devCommand });
    }

    return new Promise<BridgeTunnelOfferResult>((resolve) => {
      store.phase.set({
        kind: 'bridge-tunnel-offer',
        projectDir,
        devCommand,
        resolve,
      });
    });
  };

  return {
    interactive: true,
    releaseTerminal: ctx.releaseTerminal,
    showWelcome() {
      return new Promise<void>((resolve) => {
        store.phase.set({ kind: 'welcome', resolve });
      });
    },
    authStarted() {
      store.phase.set({
        kind: 'auth',
        dashboardUrl: null,
        status: 'Authorizing via the Novu Dashboard…',
      });
    },
    authDashboardUrl(url) {
      const current = store.phase.get();
      if (current.kind === 'auth') {
        store.phase.set({ ...current, dashboardUrl: url });
      }
    },
    authStatus(message) {
      const current = store.phase.get();
      if (current.kind === 'auth') {
        store.phase.set({ ...current, status: message });
      }
    },
    authCompleted(_envName) {
      // Transition handled by the next phase setter (listingAgents).
    },
    listingAgents() {
      store.phase.set({ kind: 'listing-agents' });
    },
    loadingIntegrations() {
      store.phase.set({ kind: 'loading-integrations' });
    },
    pickExistingOrCreate(agents) {
      return new Promise<PickResult>((resolve) => {
        store.phase.set({ kind: 'pick', agents, resolve });
      });
    },
    pickAgentConnectMode({ preselected }) {
      if (preselected) {
        return Promise.resolve(preselected);
      }

      return new Promise((resolve) => {
        store.phase.set({ kind: 'pick-connect-mode', preselected, resolve });
      });
    },
    pickAgentIntegration({ providerLabel, integrations }) {
      return new Promise((resolve) => {
        store.phase.set({
          kind: 'pick-integration',
          providerLabel,
          integrations,
          resolve,
        });
      });
    },
    promptForSecretInput({ title, placeholder, hint, secret, verificationError }) {
      return new Promise<string>((resolve) => {
        store.phase.set({
          kind: 'prompt-secret',
          title,
          placeholder,
          hint,
          secret,
          verificationError,
          resolve,
        });
      });
    },
    pickAwsClaudeRegion() {
      return new Promise<string>((resolve) => {
        store.phase.set({ kind: 'pick-aws-region', resolve });
      });
    },
    verifyingCredentials() {
      store.phase.set({ kind: 'verifying-credentials' });
    },
    credentialsVerified() {
      // Transition handled by the next phase setter.
    },
    promptForDescription(defaultPrompt) {
      if (typeof defaultPrompt === 'string' && defaultPrompt.trim().length > 0) {
        return Promise.resolve(defaultPrompt);
      }

      return new Promise<string>((resolve) => {
        store.phase.set({ kind: 'describe', resolve });
      });
    },
    refineDescription(previousPrompt) {
      return new Promise<string>((resolve) => {
        store.phase.set({ kind: 'describe', previousPrompt, resolve });
      });
    },
    generatingAgent() {
      store.phase.set({ kind: 'generating' });
    },
    previewGeneratedAgent(spec: GeneratedAgentSpec) {
      return new Promise<GeneratedAgentPreviewResult>((resolve) => {
        store.phase.set({ kind: 'preview-generated', spec, resolve });
      });
    },
    creatingAgent(name) {
      store.phase.set({ kind: 'creating', name });
    },
    agentCreated(_agent: AgentSummary) {
      // Visible after Slack completes via the final success screen.
    },
    promptForAgentName(defaultName) {
      return new Promise<string>((resolve) => {
        store.phase.set({ kind: 'prompt-agent-name', defaultName, resolve });
      });
    },
    confirmEnvSecretOverwrite({ envPath, existingMasked, nextMasked }) {
      return new Promise<boolean>((resolve) => {
        store.phase.set({
          kind: 'confirm-env-secret-overwrite',
          envPath,
          existingMasked,
          nextMasked,
          resolve,
        });
      });
    },
    confirmScaffold({ projectDir, appName, variant, llmAuthLabel }) {
      if (ctx.isTerminalReleased()) {
        return promptConfirmScaffoldInConsole({ projectDir, appName, variant, llmAuthLabel });
      }

      return new Promise<boolean>((resolve) => {
        store.phase.set({
          kind: 'confirm-scaffold',
          projectDir,
          appName,
          variant,
          llmAuthLabel,
          resolve,
        });
      });
    },
    pickLlmAuthKind({ connectMode }) {
      return ctx.pendingInteraction.register<LlmAuthKind>((resolve, reject) => {
        store.phase.set({ kind: 'pick-llm-auth', connectMode, resolve, reject });
      });
    },
    scaffoldingBridge({ variant }) {
      store.phase.set({ kind: 'scaffolding-bridge', variant });
    },
    bridgeScaffolded(opts) {
      printBridgeScaffolded(opts);
    },
    confirmInstallBridgeDeps({ projectDir, installCommand, packages, variant }) {
      if (ctx.isTerminalReleased()) {
        return promptConfirmInstallBridgeDepsInConsole({
          projectDir,
          installCommand,
          packages,
          variant,
        });
      }

      return new Promise<boolean>((resolve) => {
        store.phase.set({
          kind: 'bridge-install-deps-confirm',
          projectDir,
          installCommand,
          packages,
          variant,
          resolve,
        });
      });
    },
    installingBridgeDeps(variant) {
      store.phase.set({ kind: 'bridge-install-deps', variant });
    },
    showBridgeReconcilePlan({
      projectDir,
      requirements,
      envPaths,
      wiringInstructions,
      requirementsFile,
      agentPrompt,
      variant,
    }) {
      if (ctx.isTerminalReleased()) {
        return promptBridgeReconcilePlanInConsole({
          projectDir,
          requirements,
          envPaths,
          wiringInstructions,
          requirementsFile,
          variant,
        });
      }

      return new Promise<void>((resolve) => {
        store.phase.set({
          kind: 'bridge-reconcile-plan',
          projectDir,
          requirements,
          envPaths,
          wiringInstructions,
          requirementsFile,
          agentPrompt,
          variant,
          resolve,
        });
      });
    },
    offerBridgeTunnel: offerBridgeTunnelImpl,
    pickChannel() {
      return new Promise((resolve) => {
        store.phase.set({ kind: 'pick-channel', resolve });
      });
    },
    awaitDashboardChannelOpen({ channel, agentDetailsUrl }) {
      return new Promise<void>((resolve) => {
        store.phase.set({
          kind: 'dashboard-channel-ready',
          channel,
          agentDetailsUrl,
          resolve,
        });
      });
    },
    addingEmailIntegration() {
      store.phase.set({ kind: 'adding-email' });
    },
    awaitEmailOpen({ inboundAddress, mailtoUrl, sendFromEmail, canGoBack }) {
      return new Promise<void>((resolve, reject) => {
        store.phase.set({
          kind: 'email-ready',
          inboundAddress,
          mailtoUrl,
          sendFromEmail,
          resolve,
          onBack: canGoBack ? () => reject(new ConnectChannelBackError()) : undefined,
        });
      });
    },
    showEmailWaiting({ inboundAddress, sendFromEmail }) {
      store.phase.set({ kind: 'email-waiting', inboundAddress, sendFromEmail });
    },
    emailConnected() {
      // Transition handled by sendingWelcome / success.
    },
    addingTelegramIntegration() {
      store.phase.set({ kind: 'adding-telegram' });
    },
    showTelegramIntro({ botfatherQr, botfatherUrl: _botfatherUrl }) {
      return new Promise<void>((resolve) => {
        store.phase.set({ kind: 'telegram-intro', botfatherQr, resolve });
      });
    },
    pickTelegramTokenDelivery() {
      return new Promise<TelegramTokenDelivery>((resolve) => {
        store.phase.set({ kind: 'pick-telegram-token-delivery', resolve });
      });
    },
    showTelegramLinkToken({ mobileQr, mobileUrl }) {
      store.phase.set({ kind: 'telegram-link-token', mobileQr, mobileUrl });
    },
    savingTelegramBotToken() {
      // Reuse the generic Telegram spinner phase — saving is near-instant.
      store.phase.set({ kind: 'adding-telegram' });
    },
    showTelegramTest({ deepLinkQr, deepLinkUrl, botUsername }) {
      store.phase.set({
        kind: 'telegram-test',
        deepLinkQr,
        deepLinkUrl,
        botUsername,
      });
    },
    telegramConnected() {
      // Transition handled by sendingWelcome / success.
    },
    addingSendblueIntegration() {
      store.phase.set({ kind: 'adding-sendblue' });
    },
    showSendblueIntro({ dashboardUrl }) {
      return new Promise<void>((resolve) => {
        store.phase.set({ kind: 'sendblue-intro', dashboardUrl, resolve });
      });
    },
    promptForSendblueCredential({
      field,
      step,
      total,
      title,
      hint,
      placeholder,
      dashboardUrl,
      secret,
      verificationError,
    }) {
      return new Promise<string>((resolve) => {
        store.phase.set({
          kind: 'sendblue-credential',
          field,
          step,
          total,
          title,
          hint,
          placeholder,
          dashboardUrl,
          secret,
          verificationError,
          resolve,
        });
      });
    },
    configuringSendblueWebhook() {
      store.phase.set({ kind: 'configuring-sendblue-webhook' });
    },
    showSendblueWebhookManualFallback({ callbackUrl, webhookSecret }) {
      return new Promise<void>((resolve) => {
        store.phase.set({ kind: 'sendblue-webhook-manual', callbackUrl, webhookSecret, resolve });
      });
    },
    promptForSendblueTestPhone({ defaultPhone, fromNumber, imessageUrl, verificationError }) {
      return new Promise<string>((resolve) => {
        store.phase.set({
          kind: 'sendblue-test-phone',
          defaultPhone,
          fromNumber,
          imessageUrl,
          verificationError,
          resolve,
        });
      });
    },
    sendingSendblueTestMessage() {
      store.phase.set({ kind: 'sending-sendblue-test' });
    },
    showSendblueTestWaiting({ phone, fromNumber, imessageUrl }) {
      store.phase.set({ kind: 'sendblue-test-waiting', phone, fromNumber, imessageUrl });
    },
    sendblueConnected() {
      // Transition handled by sendingWelcome / success.
    },
    addingWhatsAppIntegration() {
      store.phase.set({ kind: 'adding-whatsapp' });
    },
    awaitWhatsAppSignupOpen({ signupUrl }) {
      return new Promise<void>((resolve) => {
        store.phase.set({ kind: 'whatsapp-signup-ready', signupUrl, resolve });
      });
    },
    showWhatsAppSignupWaiting({ signupUrl }) {
      store.phase.set({ kind: 'whatsapp-signup-waiting', signupUrl });
    },
    showWhatsAppTest({ waMeUrl, waMeQr, displayPhoneNumber }) {
      store.phase.set({ kind: 'whatsapp-test', waMeUrl, waMeQr, displayPhoneNumber });
    },
    whatsappConnected() {
      // Transition handled by sendingWelcome / success.
    },
    addingSlackIntegration() {
      store.phase.set({ kind: 'adding-slack' });
    },
    promptForSlackConfigToken({ retry, verificationError }) {
      return new Promise<string>((resolve, reject) => {
        store.phase.set({ kind: 'paste-slack-token', retry, verificationError, resolve, reject });
      });
    },
    showSlackSetupLink(_opts) {},
    runningSlackQuickSetup() {
      store.phase.set({ kind: 'running-slack-quick-setup' });
    },
    awaitSlackOAuthOpen({ authorizeUrl, appCreated }) {
      return new Promise<void>((resolve) => {
        store.phase.set({
          kind: 'slack-oauth-ready',
          authorizeUrl,
          appCreated,
          resolve,
        });
      });
    },
    showSlackWaiting({ authorizeUrl }) {
      store.phase.set({
        kind: 'waiting-slack',
        authorizeUrl,
        pollingStartedAt: Date.now(),
      });
    },
    slackConnected() {
      // Transition handled by sendingWelcome / success.
    },
    slackSkipped() {
      // No interim screen — the success screen reports skipped state.
    },
    addingAgentChatIntegration() {
      store.phase.set({ kind: 'adding-agent-chat' });
    },
    awaitAgentChatHandoff({ dashboardUrl, embedPromptFile }) {
      return new Promise<void>((resolve) => {
        store.phase.set({
          kind: 'agent-chat-handoff',
          dashboardUrl,
          embedPromptFile,
          resolve,
        });
      });
    },
    pickAgentChatSetup({ projectKind }) {
      return new Promise((resolve) => {
        store.phase.set({
          kind: 'pick-agent-chat-setup',
          projectKind,
          resolve,
        });
      });
    },
    scaffoldingAgentChat() {
      store.phase.set({ kind: 'scaffolding-agent-chat' });
    },
    sendingWelcome() {
      store.phase.set({ kind: 'sending-welcome' });
    },
    success(result) {
      if (shouldSkipConnectSuccessSummary(result)) {
        return;
      }

      if (ctx.isTerminalReleased()) {
        printConnectSuccess(result);

        return;
      }

      const embedPrompt = result.agentChatHandoff?.embedPrompt;
      const alreadyWired = result.agentChatOutcome?.alreadyWired === true;
      const awaitsEmbedDismiss =
        result.connectedChannel === 'agent-chat' &&
        result.agentChatOutcome?.mode === 'embed' &&
        (Boolean(embedPrompt) || alreadyWired);

      const successPhase = {
        kind: 'success' as const,
        agent: result.agent,
        dashboardUrl: result.dashboardUrl,
        connectDashboardUrl: result.connectDashboardUrl,
        environmentSlug: result.environmentSlug,
        connectedChannel: result.connectedChannel,
        dashboardRedirectChannel: result.dashboardRedirectChannel,
        isKeyless: result.isKeyless,
        claimUrl: result.claimUrl,
        connectMode: result.connectMode,
        chatSdkOutcome: result.chatSdkOutcome,
        aiSdkOutcome: result.aiSdkOutcome,
        langChainOutcome: result.langChainOutcome,
        customCodeOutcome: result.customCodeOutcome,
        agentChatOutcome: result.agentChatOutcome,
        agentChatHandoff: result.agentChatHandoff,
        embedPrompt: awaitsEmbedDismiss ? embedPrompt : undefined,
        embedPromptFile: awaitsEmbedDismiss
          ? (result.agentChatHandoff?.embedPromptFile ?? result.agentChatOutcome?.embedPromptFile)
          : undefined,
        resolveDismiss: undefined as (() => void | Promise<void>) | undefined,
      };

      if (awaitsEmbedDismiss) {
        const dismissWait = new Promise<void>((resolve) => {
          successPhase.resolveDismiss = () => resolve();
          store.phase.set(successPhase);
        });
        ctx.setEmbedSuccessDismissWait(dismissWait);

        return;
      }

      store.phase.set(successPhase);
    },
    failure(message) {
      if (ctx.isTerminalReleased()) {
        console.error(`${chalk.red('✗')} ${message}`);
        process.exitCode = 1;

        return;
      }

      store.phase.set({ kind: 'error', message });
    },
    shutdown: ctx.shutdown,
  };
}
