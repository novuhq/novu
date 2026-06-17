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

  const noop: typeof process.stdout.write = () => true;
  const origStdoutWrite = process.stdout.write.bind(process.stdout);
  const origStderrWrite = process.stderr.write.bind(process.stderr);
  const origLog = console.log;
  const origError = console.error;

  if (input.silent) {
    process.stdout.write = noop;
    process.stderr.write = noop;
    console.log = () => undefined;
    console.error = () => undefined;
  }

  try {
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
    });
  } finally {
    if (input.silent) {
      process.stdout.write = origStdoutWrite;
      process.stderr.write = origStderrWrite;
      console.log = origLog;
      console.error = origError;
    }
  }

  tryGitInit(root);

  return { root, appName };
}
