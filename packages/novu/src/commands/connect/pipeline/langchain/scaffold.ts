import { TemplateTypeEnum } from '../../../init/templates';
import { defaultCustomCodeScaffoldDirName } from '../bridge/agent-paths';
import { type ScaffoldBridgeProjectResult, scaffoldBridgeProject } from '../bridge/scaffold-project';

export async function scaffoldLangChainProject(input: {
  parentDir: string;
  appName: string;
  secretKey: string;
  apiUrl: string;
  agentIdentifier: string;
  silent?: boolean;
}): Promise<ScaffoldBridgeProjectResult> {
  return scaffoldBridgeProject({
    parentDir: input.parentDir,
    appName: input.appName,
    template: TemplateTypeEnum.APP_AGENT_LANGCHAIN,
    defaultAppName: defaultCustomCodeScaffoldDirName,
    secretKey: input.secretKey,
    apiUrl: input.apiUrl,
    agentIdentifier: input.agentIdentifier,
    silent: input.silent,
  });
}
