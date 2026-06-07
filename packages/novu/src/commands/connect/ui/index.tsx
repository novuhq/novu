import { render } from 'ink';
// biome-ignore lint/correctness/noUnusedImports: classic-JSX linter falls back here because tsconfig.json excludes ui/.
import React from 'react';
import type { GeneratedAgentSpec } from '../api/agents';
import { ConnectChannelBackError } from '../errors';
import type { AgentSummary, ConnectCommandOptions } from '../types';
import { App } from './app';
import { type ConnectStore, createConnectStore } from './store';
import type { ConnectUI, GeneratedAgentPreviewResult, PickResult } from './ui';

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
  let resolveDone!: (code: number) => void;
  const done = new Promise<number>((resolve) => {
    resolveDone = resolve;
  });

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
       * Only re-emit terminal lines that changed between frames. Without this,
       * the orb animation (~10 fps) redraws the whole screen and clears any
       * active mouse selection on static URL lines (auth, Slack OAuth, etc.).
       */
      incrementalRendering: true,
      // No alternate-screen here: the connect flow is short and we want the
      // final success message to remain visible in scrollback after exit.
    }
  );

  void instance.waitUntilExit().then(() => {
    resolveDone(Number(process.exitCode ?? 0));
  });

  const ui = createUiController(store, async () => {
    // Hold the final frame (error or success) on screen long enough for the
    // user to read it before Ink tears down. Without this, the App re-renders
    // with the new phase and then unmounts in the same microtask — the user
    // sees only the previous spinner and a blank line.
    const finalPhase = store.phase.get().kind;
    const holdMs = finalPhase === 'error' ? 1500 : finalPhase === 'success' ? 200 : 50;
    await new Promise<void>((resolve) => setTimeout(resolve, holdMs));
    exitInk?.();
    await instance.waitUntilExit();

    return Number(process.exitCode ?? 0);
  });

  return { ui, done };
}

function createUiController(store: ConnectStore, shutdown: () => Promise<number>): ConnectUI {
  return {
    showWelcome() {
      return new Promise<void>((resolve) => {
        store.phase.set({ kind: 'welcome', resolve });
      });
    },
    authStarted() {
      store.phase.set({ kind: 'auth', dashboardUrl: null, status: 'Authorizing via the Novu Dashboard…' });
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
    pickAgentRuntime({ preselected }) {
      return new Promise((resolve) => {
        store.phase.set({ kind: 'pick-runtime', preselected, resolve });
      });
    },
    pickAgentIntegration({ providerLabel, integrations }) {
      return new Promise((resolve) => {
        store.phase.set({ kind: 'pick-integration', providerLabel, integrations, resolve });
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
    pickChannel() {
      return new Promise((resolve) => {
        store.phase.set({ kind: 'pick-channel', resolve });
      });
    },
    awaitDashboardChannelOpen({ channel, agentDetailsUrl }) {
      return new Promise<void>((resolve) => {
        store.phase.set({ kind: 'dashboard-channel-ready', channel, agentDetailsUrl, resolve });
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
    showTelegramIntro({ botfatherQr }) {
      return new Promise<void>((resolve) => {
        store.phase.set({ kind: 'telegram-intro', botfatherQr, resolve });
      });
    },
    showTelegramLinkToken({ mobileQr, mobileUrl }) {
      store.phase.set({ kind: 'telegram-link-token', mobileQr, mobileUrl });
    },
    showTelegramTest({ deepLinkQr, deepLinkUrl, botUsername }) {
      store.phase.set({ kind: 'telegram-test', deepLinkQr, deepLinkUrl, botUsername });
    },
    telegramConnected() {
      // Transition handled by sendingWelcome / success.
    },
    addingSlackIntegration() {
      store.phase.set({ kind: 'adding-slack' });
    },
    promptForSlackConfigToken({ retry }) {
      return new Promise<string>((resolve, reject) => {
        store.phase.set({ kind: 'paste-slack-token', retry, resolve, reject });
      });
    },
    runningSlackQuickSetup() {
      store.phase.set({ kind: 'running-slack-quick-setup' });
    },
    awaitSlackOAuthOpen({ authorizeUrl, appCreated }) {
      return new Promise<void>((resolve) => {
        store.phase.set({ kind: 'slack-oauth-ready', authorizeUrl, appCreated, resolve });
      });
    },
    showSlackWaiting({ authorizeUrl }) {
      store.phase.set({ kind: 'waiting-slack', authorizeUrl, pollingStartedAt: Date.now() });
    },
    slackConnected() {
      // Transition handled by sendingWelcome / success.
    },
    slackSkipped() {
      // No interim screen — the success screen reports skipped state.
    },
    sendingWelcome() {
      store.phase.set({ kind: 'sending-welcome' });
    },
    success(result) {
      store.phase.set({
        kind: 'success',
        agent: result.agent,
        dashboardUrl: result.dashboardUrl,
        connectDashboardUrl: result.connectDashboardUrl,
        environmentSlug: result.environmentSlug,
        connectedChannel: result.connectedChannel,
        dashboardRedirectChannel: result.dashboardRedirectChannel,
      });
    },
    failure(message) {
      store.phase.set({ kind: 'error', message });
    },
    shutdown,
  };
}
