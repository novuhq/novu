import { catalog, defineGraders, sharedJudgeGraders } from '../../kit.js';

export const graders = defineGraders({
  usedLoginWhenDashboardPrompt: catalog.usedLoginWhenDashboardPrompt,
  killedFirstConnectShell: catalog.killedFirstConnectShell,
  reranWithSlackToken: catalog.reranWithSlackToken,
  pastedAuthorizeUrl: catalog.pastedLiteralUrl('https://slack.test/oauth/rerun-token'),
  reportedSuccess: catalog.reportedSuccess,
  ...sharedJudgeGraders,
});
