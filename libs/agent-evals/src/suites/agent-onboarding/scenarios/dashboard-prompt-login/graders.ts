import { catalog, defineGraders, judge, judgePrompts, labeled } from '../../kit.js';

export const graders = defineGraders({
  usedDashboardOAuthWhenPrompted: labeled(
    'uses dashboard OAuth (omits --keyless) when the user is signed into the dashboard',
    catalog.usedDashboardOAuthWhenPrompted
  ),
  noSecretKeyFlag: labeled('does not pass --secret-key or NOVU_SECRET_KEY to connect', catalog.noSecretKeyFlag),
  usesBridgeRuntime: labeled(
    'runs connect with --runtime ai-sdk or langchain for the add-to-my-app bridge path',
    catalog.usesBridgeRuntimeWhenAddingToApp
  ),
  backgroundConnectShell: labeled(
    'runs connect in the background and polls output with BashOutput',
    catalog.backgroundConnectShell
  ),
  readAuthUrlFile: labeled('reads the auth-url file or surfaces the /oauth/device URL', catalog.readAuthUrlFile),
  readRequirementsFile: labeled(
    'reads the AI SDK or LangChain requirements file after connect',
    catalog.readRequirementsFile
  ),
  reportedSuccess: labeled('confirms the agent is live in the final report', catalog.reportedSuccess),
  conclusionFirstReport: labeled(
    'leads the final report with the CLI result and next action',
    judge(judgePrompts.conclusionFirstReport, (result) => result.finalText)
  ),
});
