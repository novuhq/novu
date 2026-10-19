import { catalog, defineGraders, labeled, sharedJudgeGraders } from '../../kit.js';

const mailtoUrl = 'mailto:connect+agent123@inbound.novu.test?subject=Novu%20Connect';

export const graders = defineGraders({
  noSecretKeyFlag: labeled('does not pass --secret-key or NOVU_SECRET_KEY to connect', catalog.noSecretKeyFlag),
  backgroundConnectShell: labeled(
    'runs connect in the background and polls output with BashOutput',
    catalog.backgroundConnectShell
  ),
  pastedMailto: labeled('surfaces the mailto handoff URL to the user', catalog.pastedLiteralUrl(mailtoUrl)),
  reportedSuccess: labeled('confirms the agent is live in the final report', catalog.reportedSuccess),
  ...sharedJudgeGraders,
});
