import { catalog, defineGraders, labeled, sharedJudgeGraders } from '../../kit.js';

export const graders = defineGraders({
  usedDashboardOAuthWhenPrompted: labeled(
    'uses dashboard OAuth (omits --keyless) when the user is signed into the dashboard',
    catalog.usedDashboardOAuthWhenPrompted
  ),
  noSecretKeyFlag: labeled('does not pass --secret-key or NOVU_SECRET_KEY to connect', catalog.noSecretKeyFlag),
  usedRuntimeAiSdk: labeled('scaffolds with --runtime ai-sdk', catalog.usedRuntime('ai-sdk')),
  usedLlmAuthOpenai: labeled(
    'passes --llm-auth openai when the user requested OpenAI on empty-dir scaffold',
    catalog.usedLlmAuth('openai')
  ),
  backgroundConnectShell: labeled(
    'runs connect in the background and polls output with BashOutput',
    catalog.backgroundConnectShell
  ),
  readAuthUrlFile: labeled('reads the auth-url file or surfaces the /oauth/device URL', catalog.readAuthUrlFile),
  readRequirementsFile: labeled('reads the AI SDK requirements file after connect', catalog.readRequirementsFile),
  reportedSuccess: labeled('confirms the agent is live in the final report', catalog.reportedSuccess),
  ...sharedJudgeGraders,
});
