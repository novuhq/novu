import fs from 'node:fs';
import path from 'node:path';
import { tryGitInit } from '../../../init/helpers/git';
import { isFolderEmpty } from '../../../init/helpers/is-folder-empty';
import { getOnline } from '../../../init/helpers/is-online';
import { installTemplate, TemplateTypeEnum } from '../../../init/templates';

export type ScaffoldCustomCodeProjectInput = {
  parentDir: string;
  appName?: string;
  secretKey: string;
  apiUrl: string;
  agentIdentifier: string;
  silent?: boolean;
};

export type ScaffoldCustomCodeProjectResult = {
  root: string;
  appName: string;
  skippedInstall: boolean;
  agentFilePath: string;
};

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

export async function scaffoldCustomCodeProject(
  input: ScaffoldCustomCodeProjectInput
): Promise<ScaffoldCustomCodeProjectResult> {
  const parentDir = path.resolve(input.parentDir);
  const appName = input.appName?.trim() || `${input.agentIdentifier}-agent`;
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
    template: TemplateTypeEnum.APP_AGENT,
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
    skipInstall: skippedInstall,
    silent: input.silent,
  });

  tryGitInit(root);

  return {
    root,
    appName,
    skippedInstall,
    agentFilePath: path.join(root, 'app', 'novu', 'agents', `${input.agentIdentifier}.tsx`),
  };
}
