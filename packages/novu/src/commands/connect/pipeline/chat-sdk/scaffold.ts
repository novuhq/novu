import { TemplateTypeEnum } from '../../../init/templates';
import { defaultChatSdkScaffoldDirName } from '../bridge/detect-project';
import { scaffoldBridgeProject } from '../bridge/scaffold-project';

export type ScaffoldChatSdkProjectInput = {
  parentDir: string;
  appName?: string;
  secretKey: string;
  apiUrl: string;
  agentIdentifier: string;
  silent?: boolean;
};

export type ScaffoldChatSdkProjectResult = {
  root: string;
  appName: string;
  skippedInstall: boolean;
};

export async function scaffoldChatSdkProject(
  input: ScaffoldChatSdkProjectInput
): Promise<ScaffoldChatSdkProjectResult> {
  const result = await scaffoldBridgeProject({
    ...input,
    template: TemplateTypeEnum.APP_CHAT_SDK,
    defaultAppName: defaultChatSdkScaffoldDirName,
  });

  return {
    root: result.root,
    appName: result.appName,
    skippedInstall: result.skippedInstall,
  };
}
