import { catalog, defineGraders, labeled, sharedJudgeGraders } from '../../kit.js';

export const graders = defineGraders({
  usedDashboardOAuthWhenPrompted: labeled(
    'uses dashboard OAuth (omits --keyless) when the user is signed into the dashboard',
    catalog.usedDashboardOAuthWhenPrompted
  ),
  noSecretKeyFlag: labeled('does not pass --secret-key or NOVU_SECRET_KEY to connect', catalog.noSecretKeyFlag),
  usedRuntimeLangchain: labeled('scaffolds with --runtime langchain', catalog.usedRuntime('langchain')),
  noLlmAuthFlag: labeled(
    'omits provider --llm-auth when the user accepted demo echo on empty-dir scaffold',
    catalog.usedDemoEchoLlmAuth
  ),
  backgroundConnectShell: labeled(
    'runs connect in the background and polls output with BashOutput',
    catalog.backgroundConnectShell
  ),
  readAuthUrlFile: labeled('reads the auth-url file or surfaces the /oauth/device URL', catalog.readAuthUrlFile),
  readRequirementsFile: labeled('reads the LangChain requirements file after connect', catalog.readRequirementsFile),
  reportedSuccess: labeled('confirms the agent is live in the final report', catalog.reportedSuccess),
  ...sharedJudgeGraders,
});
