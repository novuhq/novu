import { catalog, defineGraders, labeled, sharedJudgeGraders } from '../../kit.js';

const signupUrl = 'https://dashboard.novu.test/agents/whatsapp/connect/token-wa-1';
const waMeUrl = 'https://wa.me/14155550100';
const claimUrl = 'https://dashboard.novu.test/claim/whatsapp-token';

export const graders = defineGraders({
  noSecretKeyFlag: labeled('does not pass --secret-key or NOVU_SECRET_KEY to connect', catalog.noSecretKeyFlag),
  backgroundConnectShell: labeled(
    'runs connect in the background and polls output with BashOutput',
    catalog.backgroundConnectShell
  ),
  usedPickerForDecisions: labeled('uses AskUserQuestion for channel decisions', catalog.usedPickerForDecisions),
  confirmedBeforeRun: labeled('confirms with the user before running connect', catalog.confirmedBeforeRun),
  pastedSignupUrl: labeled('surfaces the Meta Embedded Signup URL to the user', catalog.pastedLiteralUrl(signupUrl)),
  pastedWaMeUrl: labeled('surfaces the wa.me test-message link to the user', catalog.pastedLiteralUrl(waMeUrl)),
  reportedClaimLink: labeled('surfaces the claim link to the user', catalog.pastedLiteralUrl(claimUrl)),
  reportedSuccess: labeled('confirms the agent is live in the final report', catalog.reportedSuccess),
  ...sharedJudgeGraders,
});
