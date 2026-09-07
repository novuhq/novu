import { catalog, defineGraders, labeled, sharedJudgeGraders } from '../../kit.js';

export const graders = defineGraders({
  usedDashboardOAuthWhenPrompted: labeled(
    'uses dashboard OAuth (omits --keyless) when the user is signed into the dashboard',
    catalog.usedDashboardOAuthWhenPrompted
  ),
  killedFirstConnectShell: labeled('kills the first connect shell before re-running', catalog.killedFirstConnectShell),
  reranWithSlackToken: labeled('re-runs connect with --slack-config-token', catalog.reranWithSlackToken),
  pastedAuthorizeUrl: labeled(
    'surfaces the Slack authorize URL to the user',
    catalog.pastedLiteralUrl('https://slack.test/oauth/rerun-token')
  ),
  reportedSuccess: labeled('confirms the agent is live in the final report', catalog.reportedSuccess),
  ...sharedJudgeGraders,
});
