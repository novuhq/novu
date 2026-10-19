import { catalog, defineGraders, labeled, sharedJudgeGraders } from '../../kit.js';

const dashboardChatUrl = 'https://dashboard.novu.test/env/dev/agents/chat-agent-1/chat';

export const graders = defineGraders({
  usedDashboardOAuthWhenPrompted: labeled(
    'uses dashboard OAuth when the Web Chat prompt comes from the dashboard',
    catalog.usedDashboardOAuthWhenPrompted
  ),
  usedWebChatChannel: labeled('runs connect with --channel web-chat', catalog.usedWebChatChannel),
  usedManagedDefaults: labeled(
    'omits bridge runtime and Web Chat setup overrides',
    catalog.usedManagedWebChatDefaults
  ),
  skippedChannelPicker: labeled(
    'does not ask for a channel after Web Chat was named',
    catalog.skippedChannelPickerForWebChat
  ),
  backgroundConnectShell: labeled(
    'runs connect in the background and polls output with BashOutput',
    catalog.backgroundConnectShell
  ),
  readAuthUrlFile: labeled('reads the dashboard auth URL file', catalog.readAuthUrlFile),
  pastedDashboardChatUrl: labeled('surfaces the dashboard Chat URL', catalog.pastedLiteralUrl(dashboardChatUrl)),
  readEmbedPrompt: labeled('reads the Web Chat embed prompt file', catalog.readWebChatEmbedPrompt),
  reportedWebChatSuccess: labeled('reports the literal Web Chat success line', catalog.reportedWebChatSuccess),
  didNotPromiseClaim: labeled('does not promise an unavailable claim link', catalog.didNotPromiseWebChatClaim),
  ...sharedJudgeGraders,
});
