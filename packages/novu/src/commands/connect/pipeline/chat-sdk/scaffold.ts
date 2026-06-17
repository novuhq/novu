import fs from 'node:fs';
import path from 'node:path';
import { tryGitInit } from '../../../init/helpers/git';
import { isFolderEmpty } from '../../../init/helpers/is-folder-empty';
import { getOnline } from '../../../init/helpers/is-online';
import { installTemplate, TemplateTypeEnum } from '../../../init/templates';
import { defaultScaffoldDirName } from './detect-project';

export type ScaffoldChatSdkProjectInput = {
  parentDir: string;
  appName?: string;
  secretKey: string;
  apiUrl: string;
  agentIdentifier: string;
  /** When true, suppress all stdout/stderr during template installation (Ink TUI is active). */
  silent?: boolean;
};

export type ScaffoldChatSdkProjectResult = {
  root: string;
  appName: string;
};

export async function scaffoldChatSdkProject(
  input: ScaffoldChatSdkProjectInput
): Promise<ScaffoldChatSdkProjectResult> {
  const parentDir = path.resolve(input.parentDir);
  const appName = input.appName?.trim() || defaultScaffoldDirName(input.agentIdentifier);
  const root = path.join(parentDir, appName);

  if (fs.existsSync(root) && !isFolderEmpty(root, appName)) {
    throw new Error(`Cannot scaffold into "${root}" — the directory is not empty.`);
  }

  fs.mkdirSync(root, { recursive: true });

  const isOnline = await getOnline();

  await installTemplate({
    appName,
    root,
    template: TemplateTypeEnum.APP_CHAT_SDK,
    mode: 'ts',
    packageManager: 'npm',
    isOnline,
    eslint: true,
    srcDir: false,
    importAlias: '@/*',
    secretKey: input.secretKey,
    apiUrl: input.apiUrl,
    applicationId: '',
    userId: '',
    agentIdentifier: input.agentIdentifier,
    silent: input.silent,
  });

  tryGitInit(root);

  return { root, appName };
}
