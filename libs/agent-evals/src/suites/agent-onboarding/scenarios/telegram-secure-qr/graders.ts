import { catalog, defineGraders, sharedJudgeGraders } from '../../kit.js';

export const graders = defineGraders({
  noSecretKeyFlag: catalog.noSecretKeyFlag,
  backgroundConnectShell: catalog.backgroundConnectShell,
  qrHostAware: catalog.qrHostAware,
  pastedSetupUrl: catalog.pastedLiteralUrl('https://setup.novu.test/telegram/abc'),
  reportedSuccess: catalog.reportedSuccess,
  ...sharedJudgeGraders,
});
