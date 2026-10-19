import { catalog, defineGraders, labeled, sharedJudgeGraders } from '../../kit.js';

const setupUrl = 'https://setup.novu.test/slack/abc123';
const authorizeUrl = 'https://slack.test/oauth/authorize/xyz';
const claimUrl = 'https://dashboard.novu.test/claim/token-abc';

export const graders = defineGraders({
  noSecretKeyFlag: labeled('does not pass --secret-key or NOVU_SECRET_KEY to connect', catalog.noSecretKeyFlag),
  backgroundConnectShell: labeled(
    'runs connect in the background and polls output with BashOutput',
    catalog.backgroundConnectShell
  ),
  usedPickerForDecisions: labeled(
    'uses AskUserQuestion for channel and token decisions',
    catalog.usedPickerForDecisions
  ),
  confirmedBeforeRun: labeled('confirms with the user before running connect', catalog.confirmedBeforeRun),
  usedSecureTokenPath: labeled(
    'uses the secure token path instead of passing --slack-config-token inline',
    catalog.usedSecureTokenPath
  ),
  pastedSetupUrl: labeled('surfaces the Slack setup URL to the user', catalog.pastedLiteralUrl(setupUrl)),
  pastedAuthorizeUrl: labeled('surfaces the Slack authorize URL to the user', catalog.pastedLiteralUrl(authorizeUrl)),
  reportedClaimLink: labeled('surfaces the claim link to the user', catalog.pastedLiteralUrl(claimUrl)),
  reportedSuccess: labeled('confirms the agent is live in the final report', catalog.reportedSuccess),
  ...sharedJudgeGraders,
});
