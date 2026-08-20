import chalk from 'chalk';
import { channelDisplayName, resolveConnectSuccessDestination, UNCLAIMED_KEYLESS_HINT } from '../dashboard-urls';
import { printDevCommandBox } from '../pipeline/bridge/print-bridge-dev-next-steps';
import { resolveBridgeSetupFollowUpMessage } from '../pipeline/bridge/setup-outcome-message';
import {
  type ConnectSuccessResult,
  describeEmbedSuccessNextStep,
  resolveAgentChatSuccessPresentation,
} from './format-agent-chat-success';
import type { ConnectUI } from './ui';

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

  const agentChatPresentation = resolveAgentChatSuccessPresentation(result);
  if (agentChatPresentation?.kind === 'merged-scaffold') {
    console.log('');
    console.log(`${chalk.green('✓')} Agent app ready with Agent Chat.`);
    console.log(
      `  ${chalk.bold('Agent:')} ${agentChatPresentation.agentName} ${chalk.gray(`(${agentChatPresentation.agentIdentifier})`)}`
    );
    console.log(`  ${chalk.bold('App:')} ${agentChatPresentation.appName}`);
    console.log('');
    console.log(`  ${chalk.bold('One Next.js app serves both:')}`);
    console.log(`    ${chalk.cyan('Agent Chat UI')}  ${chalk.underline(agentChatPresentation.chatUrl)}`);
    console.log(`    ${chalk.cyan('Agent handler')}  ${agentChatPresentation.handlerRoute}`);
    if (agentChatPresentation.editAgentHint) {
      console.log(`  ${chalk.gray(agentChatPresentation.editAgentHint)}`);
    }
    printDevCommandBox(agentChatPresentation.devCommand);

    return;
  }

  if (agentChatPresentation?.kind === 'embed') {
    console.log('');
    console.log(`${chalk.green('✓')} Agent Chat connected`);
    if (agentChatPresentation.alreadyWired) {
      if (agentChatPresentation.envSummary) {
        console.log(`  ${chalk.dim(`Refreshed ${agentChatPresentation.envSummary} with your Novu keys.`)}`);
      }
      console.log(`  ${chalk.bold('Status:')} This project is already wired for Agent Chat.`);
      console.log(`  ${chalk.dim('Run npm run dev:novu to start local dev.')}`);

      return;
    }

    if (agentChatPresentation.envSummary) {
      console.log(`  ${chalk.dim(`Updated ${agentChatPresentation.envSummary} with your Novu keys.`)}`);
    }
    console.log(`  ${chalk.bold('Next:')} Copy the setup prompt below into your coding agent.`);
    console.log(`  ${chalk.dim(describeEmbedSuccessNextStep(agentChatPresentation.connectMode))}`);
    if (agentChatPresentation.embedPromptFile) {
      console.log(`  ${chalk.dim('Prompt file:')} ${agentChatPresentation.embedPromptFile}`);
    }
    if (agentChatPresentation.embedPrompt) {
      console.log('');
      console.log(agentChatPresentation.embedPrompt);
    }

    return;
  }

  if (agentChatPresentation?.kind === 'standalone-scaffold') {
    console.log('');
    console.log(`${chalk.green('✓')} Agent Chat app ready.`);
    console.log(`  ${chalk.bold('Local URL:')} ${chalk.underline(agentChatPresentation.chatUrl)}`);
    printDevCommandBox(agentChatPresentation.devCommand);

    return;
  }

  const destination = resolveConnectSuccessDestination({
    connectDashboardUrl: result.connectDashboardUrl,
    environmentSlug: result.environmentSlug,
    agentIdentifier: result.agent.identifier,
    isKeyless: result.isKeyless,
    claimUrl: result.claimUrl ?? null,
  });
  const channelLabel = resolveChannelLabel(result.connectedChannel);
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
  if (agentChatPresentation?.kind === 'generic-linked') {
    if (agentChatPresentation.dashboardUrl) {
      console.log(`  ${chalk.cyan('→')} Try chat in the dashboard: ${agentChatPresentation.dashboardUrl}`);
    }
    if (agentChatPresentation.embedPromptFile) {
      console.log(`  ${chalk.cyan('→')} Embed prompt saved to: ${agentChatPresentation.embedPromptFile}`);
    }
    if (agentChatPresentation.projectDir) {
      console.log(`  ${chalk.cyan('→')} Example app: ${agentChatPresentation.projectDir}`);
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

function resolveChannelLabel(connectedChannel: ConnectSuccessResult['connectedChannel']): string | null {
  if (connectedChannel === 'slack') return 'Slack';
  if (connectedChannel === 'telegram') return 'Telegram';
  if (connectedChannel === 'email') return 'Email';
  if (connectedChannel === 'sendblue') return 'iMessage (Sendblue)';
  if (connectedChannel === 'whatsapp') return 'WhatsApp';
  if (connectedChannel === 'agent-chat') return 'Agent Chat';

  return null;
}
