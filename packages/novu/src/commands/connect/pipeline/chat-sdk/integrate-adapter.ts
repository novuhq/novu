import fs from 'node:fs';
import path from 'node:path';
import type { PackageManager } from '../../../init/helpers/get-pkg-manager';
import { installPackages } from '../../../init/helpers/install';
import { getTemplateFile } from '../../../init/templates';
import { TemplateTypeEnum } from '../../../init/templates/types';
import { type InstalledSkill, installSkills, resolveSkillHosts } from '../../../wizard/skills/install-skills';
import { mergeEnvLocal } from './wire-env';

export type AdapterIntegrationInput = {
  projectDir: string;
  secretKey: string;
  agentIdentifier: string;
  apiBaseUrl?: string;
  overwriteSecretKey?: boolean;
  silent?: boolean;
};

export type AdapterIntegrationResult = {
  envPath: string;
  updatedKeys: string[];
  adapterInstalled: boolean;
  skillsInstalled: InstalledSkill[];
  bridgeFilesAdded: string[];
  /** True when bridge route files could not be added automatically. */
  needsAgentFollowUp: boolean;
};

type NextAppLayout = {
  appDir: string;
  libDir: string;
  importPrefix: string;
};

const ADAPTER_PACKAGE = '@novu/chat-sdk-adapter';

export function detectProjectPackageManager(projectDir: string): PackageManager {
  if (fs.existsSync(path.join(projectDir, 'pnpm-lock.yaml'))) {
    return 'pnpm';
  }

  if (fs.existsSync(path.join(projectDir, 'yarn.lock'))) {
    return 'yarn';
  }

  if (fs.existsSync(path.join(projectDir, 'bun.lockb'))) {
    return 'bun';
  }

  return 'npm';
}

function readPackageJson(projectDir: string): Record<string, unknown> | null {
  const packageJsonPath = path.join(projectDir, 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function hasDependency(pkg: Record<string, unknown>, name: string): boolean {
  const sections = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'] as const;

  return sections.some((section) => {
    const deps = pkg[section];
    if (!deps || typeof deps !== 'object') {
      return false;
    }

    return Object.prototype.hasOwnProperty.call(deps, name);
  });
}

function detectNextAppLayout(projectDir: string): NextAppLayout | null {
  const candidates: NextAppLayout[] = [
    { appDir: path.join(projectDir, 'app'), libDir: path.join(projectDir, 'lib'), importPrefix: '@/lib' },
    { appDir: path.join(projectDir, 'src', 'app'), libDir: path.join(projectDir, 'src', 'lib'), importPrefix: '@/lib' },
  ];

  for (const layout of candidates) {
    if (fs.existsSync(layout.appDir)) {
      return layout;
    }
  }

  return null;
}

function copyTemplateFile(templateRelativePath: string, destination: string): void {
  const source = getTemplateFile({
    template: TemplateTypeEnum.APP_CHAT_SDK,
    mode: 'ts',
    file: templateRelativePath,
  });

  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
}

function wireBridgeFiles(projectDir: string): string[] {
  const layout = detectNextAppLayout(projectDir);
  if (!layout) {
    return [];
  }

  const added: string[] = [];
  const agentDest = path.join(layout.libDir, 'novu', 'agent.ts');
  const routeDest = path.join(layout.appDir, 'api', 'webhooks', 'novu', 'route.ts');

  if (!fs.existsSync(agentDest)) {
    copyTemplateFile('lib/novu/agent.ts', agentDest);
    added.push(path.relative(projectDir, agentDest));
  }

  if (!fs.existsSync(routeDest)) {
    copyTemplateFile('app/api/webhooks/novu/route.ts', routeDest);
    added.push(path.relative(projectDir, routeDest));
  }

  return added;
}

export async function runChatSdkAdapterIntegration(input: AdapterIntegrationInput): Promise<AdapterIntegrationResult> {
  const projectDir = path.resolve(input.projectDir);
  const pkg = readPackageJson(projectDir);
  const packageManager = detectProjectPackageManager(projectDir);

  const merge = mergeEnvLocal({
    projectDir,
    secretKey: input.secretKey,
    agentIdentifier: input.agentIdentifier,
    apiBaseUrl: input.apiBaseUrl,
    overwriteSecretKey: input.overwriteSecretKey,
  });

  let adapterInstalled = false;
  if (pkg && !hasDependency(pkg, ADAPTER_PACKAGE)) {
    await installPackages(packageManager, [ADAPTER_PACKAGE], {
      cwd: projectDir,
      silent: input.silent,
    });
    adapterInstalled = true;
  }

  const skillHosts = resolveSkillHosts(projectDir);
  const { installed: skillsInstalled } = installSkills(projectDir, skillHosts);

  const bridgeFilesAdded = wireBridgeFiles(projectDir);
  const needsAgentFollowUp = bridgeFilesAdded.length === 0;

  return {
    envPath: merge.envPath,
    updatedKeys: merge.updatedKeys,
    adapterInstalled,
    skillsInstalled: skillsInstalled.filter((skill) => skill.name === 'novu-chat-sdk'),
    bridgeFilesAdded,
    needsAgentFollowUp,
  };
}
