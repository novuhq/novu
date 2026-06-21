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
  /** True when npm install was skipped because we're inside a monorepo workspace. */
  skippedInstall: boolean;
};

/**
 * Walk up from `dir` looking for a package.json with a `workspaces` field or
 * a `pnpm-workspace.yaml`. Returns the workspace root path, or null if none found.
 */
function findWorkspaceRoot(dir: string): string | null {
  let current = path.resolve(dir);
  const root = path.parse(current).root;

  while (current !== root) {
    const pkgPath = path.join(current, 'package.json');
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8')) as Record<string, unknown>;
        if (pkg.workspaces) return current;
      } catch {
        // ignore malformed package.json
      }
    }
    if (fs.existsSync(path.join(current, 'pnpm-workspace.yaml'))) return current;

    current = path.dirname(current);
  }

  return null;
}

export async function scaffoldChatSdkProject(
  input: ScaffoldChatSdkProjectInput
): Promise<ScaffoldChatSdkProjectResult> {
  const parentDir = path.resolve(input.parentDir);
  const appName = input.appName?.trim() || defaultScaffoldDirName(input.agentIdentifier);
  if (path.isAbsolute(appName) || path.basename(appName) !== appName || appName === '.' || appName === '..') {
    throw new Error(`Invalid scaffold directory name "${appName}". Use a single relative directory name.`);
  }
  const root = path.join(parentDir, appName);

  if (fs.existsSync(root) && !isFolderEmpty(root, appName)) {
    throw new Error(`Cannot scaffold into "${root}" — the directory is not empty.`);
  }

  fs.mkdirSync(root, { recursive: true });

  const workspaceRoot = findWorkspaceRoot(parentDir);
  const skippedInstall = workspaceRoot !== null;

  const isOnline = skippedInstall ? true : await getOnline();

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
    // Skip install when inside a monorepo — workspace: specifiers in sibling
    // packages cause npm to fail with EUNSUPPORTEDPROTOCOL.
    skipInstall: skippedInstall,
    silent: input.silent,
  });

  tryGitInit(root);

  return { root, appName, skippedInstall };
}
