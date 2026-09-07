import { TemplateTypeEnum } from '../../../init/templates';
import { defaultCustomCodeScaffoldDirName } from '../bridge/agent-paths';
import { type ScaffoldBridgeProjectResult, scaffoldBridgeProject } from '../bridge/scaffold-project';
import type { LlmAuthChoice } from '../llm-auth/types';

export async function scaffoldLangChainProject(input: {
  parentDir: string;
  appName: string;
  secretKey: string;
  apiUrl: string;
  agentIdentifier: string;
  silent?: boolean;
  llmAuth: LlmAuthChoice;
  region?: string;
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
    llmAuth: input.llmAuth,
    region: input.region,
  });
}
