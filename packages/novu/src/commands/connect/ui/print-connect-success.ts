import chalk from 'chalk';
import { channelDisplayName } from '../dashboard-urls';
import { resolveBridgeSetupFollowUpMessage } from '../pipeline/bridge/setup-outcome-message';
import type { ConnectUI } from './ui';

type ConnectSuccessResult = Parameters<ConnectUI['success']>[0];

export function shouldSkipConnectSuccessSummary(result: ConnectSuccessResult): boolean {
  return result.customCodeOutcome?.scaffolded === true || result.chatSdkOutcome?.scaffolded === true;
}

export function printConnectSuccess(result: ConnectSuccessResult): void {
  if (shouldSkipConnectSuccessSummary(result)) {
    return;
  }

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
    console.log(`  ${chalk.cyan('→')} Finish ${redirectChannelLabel} setup in Novu Connect — we opened it for you.`);
  } else {
    console.log(`  ${chalk.gray('No channel connected.')}`);
  }
  if (result.isKeyless && result.claimUrl) {
    console.log(`  ${chalk.bold('Claim your agent:')} ${result.claimUrl}`);
    console.log(`  ${chalk.gray('Sign up to move your agent and conversation into your own account.')}`);
  } else {
    console.log(`  ${chalk.bold('Dashboard:')} ${agentUrl}`);
  }
  const followUp = resolveBridgeSetupFollowUpMessage(result.connectMode, {
    chatSdk: result.chatSdkOutcome,
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
