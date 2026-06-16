import { catalog, defineGraders, sharedJudgeGraders } from '../../kit.js';

export const graders = defineGraders({
  usedLoginWhenDashboardPrompt: catalog.usedLoginWhenDashboardPrompt,
  noSecretKeyFlag: catalog.noSecretKeyFlag,
  backgroundConnectShell: catalog.backgroundConnectShell,
  readAuthUrlFile: catalog.readAuthUrlFile,
  reportedSuccess: catalog.reportedSuccess,
  ...sharedJudgeGraders,
});
