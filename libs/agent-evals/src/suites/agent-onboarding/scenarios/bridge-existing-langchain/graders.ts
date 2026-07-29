import { catalog, defineGraders, labeled, sharedJudgeGraders } from '../../kit.js';

export const graders = defineGraders({
  usedDashboardOAuthWhenPrompted: labeled(
    'uses dashboard OAuth (omits --keyless) when the user is signed into the dashboard',
    catalog.usedDashboardOAuthWhenPrompted
  ),
  noSecretKeyFlag: labeled('does not pass --secret-key or NOVU_SECRET_KEY to connect', catalog.noSecretKeyFlag),
  usedRuntimeLangchain: labeled(
    'detects LangChain and runs connect with --runtime langchain',
    catalog.usedRuntime('langchain')
  ),
  noLlmAuthFlag: labeled('does not pass --llm-auth on an existing project', catalog.noLlmAuthFlag),
  backgroundConnectShell: labeled(
    'runs connect in the background and polls output with BashOutput',
    catalog.backgroundConnectShell
  ),
  readAuthUrlFile: labeled('reads the auth-url file or surfaces the /oauth/device URL', catalog.readAuthUrlFile),
  readRequirementsFile: labeled('reads the LangChain requirements file after connect', catalog.readRequirementsFile),
  wroteBridgeWiring: labeled(
    'Writes the bridge route and LangChain agent handler',
    catalog.wroteBridgeWiring({ runtime: 'langchain', agentId: 'acme-lc-1' })
  ),
  reportedSuccess: labeled('confirms the agent is live in the final report', catalog.reportedSuccess),
  ...sharedJudgeGraders,
});
