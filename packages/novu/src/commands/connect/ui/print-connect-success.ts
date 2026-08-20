import fs from 'node:fs';
import path from 'node:path';
import chalk from 'chalk';
import { channelDisplayName, resolveConnectSuccessDestination, UNCLAIMED_KEYLESS_HINT } from '../dashboard-urls';
import { printDevCommandBox } from '../pipeline/bridge/print-bridge-dev-next-steps';
import { resolveBridgeSetupFollowUpMessage } from '../pipeline/bridge/setup-outcome-message';
import type { AgentConnectMode } from '../types';
import type { ConnectUI } from './ui';

type ConnectSuccessResult = Parameters<ConnectUI['success']>[0];

export function shouldSkipConnectSuccessSummary(result: ConnectSuccessResult): boolean {
  if (result.connectedChannel === 'agent-chat') {
    return false;
  }

  return (
    result.customCodeOutcome?.scaffolded === true ||
    result.chatSdkOutcome?.scaffolded === true ||
    result.aiSdkOutcome?.scaffolded === true ||
    result.langChainOutcome?.scaffolded === true
  );
}

function resolveScaffoldDevPort(projectDir: string): number {
  try {
    const packageJson = JSON.parse(fs.readFileSync(path.join(projectDir, 'package.json'), 'utf8')) as {
      scripts?: Record<string, string>;
    };
    const scripts = Object.values(packageJson.scripts ?? {}).join('\n');
    const portMatch = scripts.match(/--port[=\s]+(\d+)/) ?? scripts.match(/-p\s+(\d+)/) ?? scripts.match(/PORT=(\d+)/);

    if (portMatch) {
      return Number.parseInt(portMatch[1], 10);
    }
  } catch {
    // Fall back to the default agent scaffold port.
  }

  return 4005;
}

function resolveBridgeHandlerRoute(connectMode: AgentConnectMode | undefined): string {
  if (connectMode === 'chat-sdk') {
    return 'POST /api/webhooks/novu';
  }

  return '/api/novu';
}

function formatLocalUrl(port: number, routePath: string): string {
  const normalizedPath = routePath.startsWith('/') ? routePath : `/${routePath}`;

  return `http://localhost:${port}${normalizedPath === '/' ? '' : normalizedPath}`;
}

export function printConnectSuccess(result: ConnectSuccessResult): void {
  if (shouldSkipConnectSuccessSummary(result)) {
    return;
  }

  const bridgeOutcome =
    result.chatSdkOutcome ?? result.aiSdkOutcome ?? result.langChainOutcome ?? result.customCodeOutcome;
  if (
    result.connectedChannel === 'agent-chat' &&
    result.agentChatOutcome?.mergedIntoBridge &&
    bridgeOutcome?.scaffolded
  ) {
    const install = bridgeOutcome.skippedInstall ? 'npm install && ' : '';
    const port = resolveScaffoldDevPort(bridgeOutcome.projectDir);
    const chatPath = result.agentChatOutcome.chatPath ?? '/';
    const chatUrl = formatLocalUrl(port, chatPath);
    const handlerRoute = resolveBridgeHandlerRoute(result.connectMode);
    const appName = path.basename(bridgeOutcome.projectDir);

    console.log('');
    console.log(`${chalk.green('✓')} Agent app ready with Agent Chat.`);
    console.log(`  ${chalk.bold('Agent:')} ${result.agent.name} ${chalk.gray(`(${result.agent.identifier})`)}`);
    console.log(`  ${chalk.bold('App:')} ${appName}`);
    console.log('');
    console.log(`  ${chalk.bold('One Next.js app serves both:')}`);
    console.log(`    ${chalk.cyan('Agent Chat UI')}  ${chalk.underline(chatUrl)}`);
    console.log(`    ${chalk.cyan('Agent handler')}  ${handlerRoute}`);
    if (result.connectMode !== 'chat-sdk') {
      console.log(`  ${chalk.gray(`Edit agent logic in app/novu/agents/${result.agent.identifier}.tsx`)}`);
    }
    printDevCommandBox(`cd ${JSON.stringify(bridgeOutcome.projectDir)} && ${install}npm run dev:novu`);

    return;
  }

  if (
    result.connectedChannel === 'agent-chat' &&
    result.agentChatOutcome?.mode === 'embed' &&
    result.agentChatOutcome.projectDir
  ) {
    console.log('');
    console.log(`${chalk.green('✓')} Agent Chat ready to add to your app.`);
    console.log(`  ${chalk.bold('Agent:')} ${result.agent.name} ${chalk.gray(`(${result.agent.identifier})`)}`);
    for (const envPath of result.agentChatOutcome.envPaths ?? []) {
      console.log(`  ${chalk.bold('Env updated:')} ${envPath}`);
    }
    if (result.agentChatOutcome.embedPromptFile) {
      console.log(`  ${chalk.bold('Prompt file:')} ${result.agentChatOutcome.embedPromptFile}`);
    }
    console.log('');
    console.log(`  ${chalk.cyan('Next:')} Paste the prompt into Cursor, Claude Code, or your coding agent.`);
    if (result.agentChatHandoff?.dashboardUrl) {
      console.log(`  ${chalk.gray('Try chat in the dashboard:')} ${result.agentChatHandoff.dashboardUrl}`);
    }

    return;
  }

  if (
    result.connectedChannel === 'agent-chat' &&
    result.agentChatOutcome?.mode === 'scaffold' &&
    result.agentChatOutcome.projectDir
  ) {
    const projectDir = result.agentChatOutcome.projectDir;
    const port = resolveScaffoldDevPort(projectDir);
    const chatPath = result.agentChatOutcome.chatPath ?? '/';
    const chatUrl = formatLocalUrl(port, chatPath);

    console.log('');
    console.log(`${chalk.green('✓')} Agent Chat app ready.`);
    console.log(`  ${chalk.bold('Local URL:')} ${chalk.underline(chatUrl)}`);
    printDevCommandBox(`cd ${JSON.stringify(projectDir)} && npm run dev`);

    return;
  }

  const destination = resolveConnectSuccessDestination({
    connectDashboardUrl: result.connectDashboardUrl,
    environmentSlug: result.environmentSlug,
    agentIdentifier: result.agent.identifier,
    isKeyless: result.isKeyless,
    claimUrl: result.claimUrl ?? null,
  });
  const channelLabel = (() => {
    if (result.connectedChannel === 'slack') return 'Slack';
    if (result.connectedChannel === 'telegram') return 'Telegram';
    if (result.connectedChannel === 'email') return 'Email';
    if (result.connectedChannel === 'sendblue') return 'iMessage (Sendblue)';
    if (result.connectedChannel === 'whatsapp') return 'WhatsApp';
    if (result.connectedChannel === 'agent-chat') return 'Agent Chat';

    return null;
  })();
  const redirectChannelLabel = result.dashboardRedirectChannel
    ? channelDisplayName(result.dashboardRedirectChannel)
    : null;

  console.log('');
  if (result.connectedChannel === 'agent-chat') {
    console.log(`${chalk.green('✓')} Agent Chat linked — add it to your app.`);
  } else {
    console.log(`${chalk.green('✓')} Your agent is live.`);
  }
  console.log(`  ${chalk.bold('Agent:')} ${result.agent.name} ${chalk.gray(`(${result.agent.identifier})`)}`);
  if (result.connectedChannel === 'agent-chat') {
    if (result.agentChatHandoff?.dashboardUrl) {
      console.log(`  ${chalk.cyan('→')} Try chat in the dashboard: ${result.agentChatHandoff.dashboardUrl}`);
    }
    if (result.agentChatOutcome?.embedPromptFile) {
      console.log(`  ${chalk.cyan('→')} Embed prompt saved to: ${result.agentChatOutcome.embedPromptFile}`);
    }
    if (result.agentChatOutcome?.projectDir) {
      console.log(`  ${chalk.cyan('→')} Example app: ${result.agentChatOutcome.projectDir}`);
    }
  } else if (channelLabel) {
    console.log(`  ${chalk.cyan('→')} Check ${channelLabel} — your agent just messaged you.`);
  } else if (redirectChannelLabel) {
    console.log(`  ${chalk.cyan('→')} Finish ${redirectChannelLabel} setup in Novu Connect — we opened it for you.`);
  } else {
    console.log(`  ${chalk.gray('No channel connected.')}`);
  }
  if (destination.kind === 'claim') {
    console.log(`  ${chalk.bold('Claim your agent:')} ${destination.url}`);
    console.log(`  ${chalk.gray('Sign up to move your agent and conversation into your own account.')}`);
  } else if (destination.kind === 'dashboard') {
    console.log(`  ${chalk.bold('Dashboard:')} ${destination.url}`);
  } else {
    console.log(`  ${chalk.gray(UNCLAIMED_KEYLESS_HINT)}`);
  }
  const followUp = resolveBridgeSetupFollowUpMessage(result.connectMode, {
    chatSdk: result.chatSdkOutcome,
    aiSdk: result.aiSdkOutcome,
    langChain: result.langChainOutcome,
    customCode: result.customCodeOutcome,
  });

  if (followUp) {
    console.log(`  ${chalk.cyan('→')} ${followUp}`);
  } else if (
    result.connectMode === 'chat-sdk' &&
    result.chatSdkOutcome &&
    !result.chatSdkOutcome.scaffolded &&
    !result.chatSdkOutcome.coreReady
  ) {
    console.log(`  ${chalk.gray('Finish the remaining setup steps above.')}`);
  }
}
