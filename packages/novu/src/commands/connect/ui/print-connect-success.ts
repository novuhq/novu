import chalk from 'chalk';
import { channelDisplayName, resolveConnectSuccessDestination, UNCLAIMED_KEYLESS_HINT } from '../dashboard-urls';
import { resolveBridgeSetupFollowUpMessage } from '../pipeline/bridge/setup-outcome-message';
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

export function printConnectSuccess(result: ConnectSuccessResult): void {
  if (shouldSkipConnectSuccessSummary(result)) {
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
    if (result.agentChatHandoff?.embedPromptFile) {
      console.log(`  ${chalk.cyan('→')} Embed prompt file: ${result.agentChatHandoff.embedPromptFile}`);
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
