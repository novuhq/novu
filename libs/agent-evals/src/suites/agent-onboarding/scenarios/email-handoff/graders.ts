import { catalog, defineGraders, sharedJudgeGraders } from '../../kit.js';

const mailtoUrl = 'mailto:connect+agent123@inbound.novu.test?subject=Novu%20Connect';

export const graders = defineGraders({
  noSecretKeyFlag: catalog.noSecretKeyFlag,
  backgroundConnectShell: catalog.backgroundConnectShell,
  pastedMailto: catalog.pastedLiteralUrl(mailtoUrl),
  reportedSuccess: catalog.reportedSuccess,
  ...sharedJudgeGraders,
});
