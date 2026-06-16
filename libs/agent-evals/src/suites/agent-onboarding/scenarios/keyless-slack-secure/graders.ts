import { catalog, defineGraders, sharedJudgeGraders } from '../../kit.js';

const setupUrl = 'https://setup.novu.test/slack/abc123';
const authorizeUrl = 'https://slack.test/oauth/authorize/xyz';
const claimUrl = 'https://dashboard.novu.test/claim/token-abc';

export const graders = defineGraders({
  noSecretKeyFlag: catalog.noSecretKeyFlag,
  backgroundConnectShell: catalog.backgroundConnectShell,
  usedPickerForDecisions: catalog.usedPickerForDecisions,
  confirmedBeforeRun: catalog.confirmedBeforeRun,
  usedSecureTokenPath: catalog.usedSecureTokenPath,
  pastedSetupUrl: catalog.pastedLiteralUrl(setupUrl),
  pastedAuthorizeUrl: catalog.pastedLiteralUrl(authorizeUrl),
  reportedClaimLink: catalog.pastedLiteralUrl(claimUrl),
  reportedSuccess: catalog.reportedSuccess,
  ...sharedJudgeGraders,
});
