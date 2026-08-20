import { catalog, defineGraders, labeled, sharedJudgeGraders } from '../../kit.js';

const dashboardChatUrl = 'https://dashboard.novu.test/env/dev/agents/chat-agent-1/chat';

export const graders = defineGraders({
  usedDashboardOAuthWhenPrompted: labeled(
    'uses dashboard OAuth when the Agent Chat prompt comes from the dashboard',
    catalog.usedDashboardOAuthWhenPrompted
  ),
  usedAgentChatChannel: labeled('runs connect with --channel agent-chat', catalog.usedAgentChatChannel),
  usedManagedDefaults: labeled(
    'omits bridge runtime and Agent Chat setup overrides',
    catalog.usedManagedAgentChatDefaults
  ),
  skippedChannelPicker: labeled(
    'does not ask for a channel after Agent Chat was named',
    catalog.skippedChannelPickerForAgentChat
  ),
  backgroundConnectShell: labeled(
    'runs connect in the background and polls output with BashOutput',
    catalog.backgroundConnectShell
  ),
  readAuthUrlFile: labeled('reads the dashboard auth URL file', catalog.readAuthUrlFile),
  pastedDashboardChatUrl: labeled('surfaces the dashboard Chat URL', catalog.pastedLiteralUrl(dashboardChatUrl)),
  readEmbedPrompt: labeled('reads the Agent Chat embed prompt file', catalog.readAgentChatEmbedPrompt),
  reportedAgentChatSuccess: labeled('reports the literal Agent Chat success line', catalog.reportedAgentChatSuccess),
  didNotPromiseClaim: labeled('does not promise an unavailable claim link', catalog.didNotPromiseAgentChatClaim),
  ...sharedJudgeGraders,
});
