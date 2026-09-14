import { getNovuScaffoldSdkTag } from '@novu/shared';
import { Sema } from 'async-sema';
import { async as glob } from 'fast-glob';
import { existsSync, readFileSync } from 'fs';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { bold, cyan } from 'picocolors';
import type { BridgeAdapterVariant } from '../../connect/pipeline/bridge-adapter/types';
import { CHAT_SDK_VERSION } from '../../connect/pipeline/chat-sdk/versions';
import { generateAgentNextConfigSource } from '../../connect/pipeline/llm-auth/codegen/generate-agent-next-config';
import { generateSupportAgentSource } from '../../connect/pipeline/llm-auth/codegen/generate-support-agent';
import { codegenSupportsTools } from '../../connect/pipeline/llm-auth/codegen/tool-support';
import { resolveLlmAuthEnvVars, shouldWireLlmAuth } from '../../connect/pipeline/llm-auth/registry';
import { resolveBridgeScaffoldDependencies } from '../../connect/pipeline/llm-auth/resolve-scaffold-dependencies';
import type { LlmAuthChoice } from '../../connect/pipeline/llm-auth/types';
import { copy } from '../helpers/copy';
import { install } from '../helpers/install';
import { resolveAgentZodDependencies } from './agent-scaffold-deps';
import { GetTemplateFileArgs, InstallTemplateArgs, TemplateType, TemplateTypeEnum } from './types';

/**
 * Templates ship next to this module (<build root>/commands/init/templates).
 * `__dirname` is that directory under the tsc module layout and ts-node dev,
 * but `dist/src` when running from the bundled CLI entry — try both, using the
 * always-present `github` template dir as the marker.
 */
function resolveTemplatesDir(): string {
  const candidates = [__dirname, path.join(__dirname, 'commands', 'init', 'templates')];

  return candidates.find((candidate) => existsSync(path.join(candidate, 'github'))) ?? __dirname;
}

const TEMPLATES_DIR = resolveTemplatesDir();
const NEXT_VERSION = '16.2.1';
const AGENT_IDENTIFIER_PATTERN = /^[a-z0-9]+(?:[-_][a-z0-9]+)*$/;

type ScaffoldPackageJson = {
  name: string;
  version: string;
  private: boolean;
  scripts: Record<string, string>;
  dependencies: Record<string, string>;
  devDependencies?: Record<string, string>;
  pnpm?: {
    peerDependencyRules: {
      allowedVersions: Record<string, string>;
    };
  };
};

type AgentInstallContext = {
  isAgent: boolean;
  isAiSdk: boolean;
  isLangChain: boolean;
  isChatSdk: boolean;
  renameAgent: string | undefined;
};

function resolveCliPackageJson(): { version?: string } | null {
  const distIndex = __dirname.lastIndexOf(`${path.sep}dist${path.sep}`);
  if (distIndex === -1) return null;

  const pkgRoot = __dirname.slice(0, distIndex);
  try {
    return JSON.parse(readFileSync(path.join(pkgRoot, 'package.json'), 'utf8')) as { version?: string };
  } catch {
    return null;
  }
}

function resolveFrameworkVersion(apiUrl: string, region?: string): string {
  return getNovuScaffoldSdkTag(apiUrl, region);
}

function resolveCliTag(): string {
  const pkg = resolveCliPackageJson();
  if (!pkg?.version) return 'latest';

  if (pkg.version.includes('-beta')) return 'beta';
  if (pkg.version.includes('-rc')) return 'rc';
  if (pkg.version.includes('-alpha')) return 'rc';

  return 'latest';
}

function isAgentTemplate(template: TemplateType): boolean {
  return (
    template === TemplateTypeEnum.APP_AGENT ||
    template === TemplateTypeEnum.APP_AGENT_AI_SDK ||
    template === TemplateTypeEnum.APP_AGENT_LANGCHAIN
  );
}

function resolveAgentContext(template: TemplateType, agentIdentifier?: string): AgentInstallContext {
  return {
    isAgent: isAgentTemplate(template),
    isAiSdk: template === TemplateTypeEnum.APP_AGENT_AI_SDK,
    isLangChain: template === TemplateTypeEnum.APP_AGENT_LANGCHAIN,
    isChatSdk: template === TemplateTypeEnum.APP_CHAT_SDK,
    renameAgent: isAgentTemplate(template) ? agentIdentifier : undefined,
  };
}

function bridgeRuntime(agent: AgentInstallContext): BridgeAdapterVariant {
  return agent.isAiSdk ? 'ai-sdk' : 'langchain';
}

function buildCopySource(template: TemplateType, mode: InstallTemplateArgs['mode'], eslint: boolean): string[] {
  const copySource = ['**'];
  if (!eslint) copySource.push('!eslintrc.json');
  if (!template.includes('react')) {
    copySource.push(mode === 'ts' ? 'tailwind.config.ts' : '!tailwind.config.js', '!postcss.config.cjs');
  }

  return copySource;
}

function assertValidAgentIdentifier(agentIdentifier: string): void {
  if (AGENT_IDENTIFIER_PATTERN.test(agentIdentifier)) return;

  throw new Error(
    `Invalid agent identifier: "${agentIdentifier}". Must be a lowercase slug (a-z, 0-9, hyphens, underscores).`
  );
}

function renameCopiedTemplateFile(name: string, agentIdentifier: string | undefined): string {
  switch (name) {
    case 'gitignore':
    case 'eslintrc.json': {
      return `.${name}`;
    }
    /*
     * README.md is ignored by webpack-asset-relocator-loader used by ncc:
     * https://github.com/vercel/webpack-asset-relocator-loader/blob/e9308683d47ff507253e37c9bcbb99474603192b/src/asset-relocator.js#L227
     */
    case 'README-template.md': {
      return 'README.md';
    }
    case 'support-agent.tsx': {
      return agentIdentifier ? `${agentIdentifier}.tsx` : name;
    }
    default: {
      return name;
    }
  }
}

async function copyTemplateFiles(
  root: string,
  templatePath: string,
  copySource: string[],
  agentIdentifier: string | undefined
): Promise<void> {
  await copy(copySource, root, {
    parents: true,
    cwd: templatePath,
    rename: (name) => renameCopiedTemplateFile(name, agentIdentifier),
  });
}

async function rewriteAgentNameInFiles(root: string, agentIdentifier: string): Promise<void> {
  const camelName = agentIdentifier.replace(/[-_]([a-z0-9])/g, (_, c) => c.toUpperCase());
  const files = await glob('**/*.{tsx,ts,md}', {
    cwd: root,
    absolute: true,
    followSymbolicLinks: false,
  });
  await Promise.all(
    files.map(async (file) => {
      const before = await fs.readFile(file, 'utf8');
      const after = before.replace(/supportAgent/g, camelName).replace(/support-agent/g, agentIdentifier);
      if (after !== before) await fs.writeFile(file, after);
    })
  );
}

async function writeLlmAuthAgentSource(
  root: string,
  agent: AgentInstallContext,
  agentIdentifier: string,
  llmAuth: LlmAuthChoice
): Promise<void> {
  if (!agent.renameAgent || !shouldWireLlmAuth(llmAuth) || !(agent.isAiSdk || agent.isLangChain)) {
    return;
  }

  const runtime = bridgeRuntime(agent);
  const agentFilePath = path.join(root, 'app', 'novu', 'agents', `${agentIdentifier}.tsx`);
  await fs.writeFile(
    agentFilePath,
    generateSupportAgentSource({
      runtime,
      agentIdentifier,
      llmAuth,
    })
  );

  if (codegenSupportsTools({ runtime, agentIdentifier, llmAuth })) return;

  const toolsDir = path.join(root, 'app', 'novu', 'agents', 'tools');
  await fs.rm(path.join(toolsDir, 'search-novu-docs.ts'), { force: true });
  await fs.rmdir(toolsDir).catch(() => undefined);
}

async function writeAgentNextConfig(root: string, agent: AgentInstallContext, llmAuth?: LlmAuthChoice): Promise<void> {
  if (!(agent.isAiSdk || agent.isLangChain)) return;

  await fs.writeFile(
    path.join(root, 'next.config.mjs'),
    generateAgentNextConfigSource(bridgeRuntime(agent), llmAuth ?? { kind: 'skip' })
  );
}

async function applyImportAlias(root: string, srcDir: boolean, importAlias: string): Promise<void> {
  const tsconfigFile = path.join(root, 'tsconfig.json');
  await fs.writeFile(
    tsconfigFile,
    (await fs.readFile(tsconfigFile, 'utf8'))
      .replace(`"@/*": ["./*"]`, srcDir ? `"@/*": ["./src/*"]` : `"@/*": ["./*"]`)
      .replace(`"@/*":`, `"${importAlias}":`)
  );

  if (importAlias === '@/*') return;

  const files = await glob('**/*', {
    cwd: root,
    dot: true,
    stats: false,
    /*
     * We don't want to modify compiler options in [ts/js]config.json
     * and none of the files in the .git folder
     */
    ignore: ['tsconfig.json', 'jsconfig.json', '.git/**/*'],
  });
  const writeSema = new Sema(8, { capacity: files.length });
  await Promise.all(
    files.map(async (file) => {
      await writeSema.acquire();
      const filePath = path.join(root, file);
      if ((await fs.stat(filePath)).isFile()) {
        await fs.writeFile(
          filePath,
          (await fs.readFile(filePath, 'utf8')).replace(`@/`, `${importAlias.replace(/\*/g, '')}`)
        );
      }
      writeSema.release();
    })
  );
}

async function relocateToSrcDir(
  root: string,
  template: TemplateType,
  mode: InstallTemplateArgs['mode']
): Promise<void> {
  await fs.mkdir(path.join(root, 'src'), { recursive: true });
  await Promise.all(
    SRC_DIR_NAMES.map(async (file) => {
      await fs.rename(path.join(root, file), path.join(root, 'src', file)).catch((err) => {
        if (err.code !== 'ENOENT') {
          throw err;
        }
      });
    })
  );

  const isAppTemplate = template.startsWith('app');
  const indexPageFile = path.join(
    'src',
    isAppTemplate ? 'app' : 'pages',
    `${isAppTemplate ? 'page' : 'index'}.${mode === 'ts' ? 'tsx' : 'js'}`
  );

  await fs.writeFile(
    indexPageFile,
    (await fs.readFile(indexPageFile, 'utf8')).replace(
      isAppTemplate ? 'app/page' : 'pages/index',
      isAppTemplate ? 'src/app/page' : 'src/pages/index'
    )
  );

  if (template !== TemplateTypeEnum.APP_REACT_EMAIL) return;

  const tailwindConfigFile = path.join(root, mode === 'ts' ? 'tailwind.config.ts' : 'tailwind.config.js');
  await fs.writeFile(
    tailwindConfigFile,
    (await fs.readFile(tailwindConfigFile, 'utf8')).replace(
      /\.\/(\w+)\/\*\*\/\*\.\{js,ts,jsx,tsx,mdx\}/g,
      './src/$1/**/*.{js,ts,jsx,tsx,mdx}'
    )
  );
}

function buildEnvVars(args: InstallTemplateArgs, agent: AgentInstallContext): Record<string, string> {
  const { secretKey, apiUrl, applicationId, userId, agentIdentifier, llmAuth } = args;
  const llmEnvVars = llmAuth ? resolveLlmAuthEnvVars(llmAuth) : {};

  if (agent.isAgent) {
    return {
      NOVU_SECRET_KEY: secretKey,
      NOVU_API_URL: apiUrl ?? 'https://api.novu.co',
      ...llmEnvVars,
    };
  }

  if (agent.isChatSdk) {
    return {
      NOVU_SECRET_KEY: secretKey,
      NOVU_AGENT_IDENTIFIER: agentIdentifier ?? 'my-chat-sdk-agent',
      ...(apiUrl && apiUrl !== 'https://api.novu.co' ? { NOVU_API_BASE_URL: apiUrl } : {}),
    };
  }

  return {
    NOVU_SECRET_KEY: secretKey,
    NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER: applicationId ?? '',
    NEXT_PUBLIC_NOVU_SUBSCRIBER_ID: userId ?? '',
  };
}

function buildTemplateDependencies(args: InstallTemplateArgs, agent: AgentInstallContext): Record<string, string> {
  const { apiUrl, region, llmAuth } = args;
  const dependencies: Record<string, string> = {
    react: '^19',
    'react-dom': '^19',
    next: NEXT_VERSION,
  };

  if (agent.isAgent) {
    dependencies['@novu/framework'] = resolveFrameworkVersion(apiUrl, region);
  }

  if (agent.isAiSdk || agent.isLangChain) {
    Object.assign(dependencies, resolveBridgeScaffoldDependencies(bridgeRuntime(agent), llmAuth));
  }

  if (agent.isChatSdk) {
    dependencies.chat = CHAT_SDK_VERSION;
    dependencies['@novu/chat-sdk-adapter'] = 'latest';
    dependencies['@chat-adapter/state-memory'] = CHAT_SDK_VERSION;
  }

  if (!agent.isAgent && !agent.isChatSdk) {
    dependencies['@novu/framework'] = resolveFrameworkVersion(apiUrl, region);
    dependencies['@novu/nextjs'] = '^2.5.0';
  }

  return dependencies;
}

function buildTemplateScripts(packageManager: string, agent: AgentInstallContext): Record<string, string> {
  const scripts: Record<string, string> = {
    dev: 'next dev --port=3000',
    build: 'next build',
    start: 'next start',
    lint: 'next lint',
  };

  if (!agent.isAgent && !agent.isChatSdk) return scripts;

  const cliTag = resolveCliTag();
  scripts.dev = `node warn-no-tunnel.mjs ${packageManager} && next dev --port=4005`;
  scripts['dev:novu'] = agent.isChatSdk
    ? `PORT=4005 npx novu@${cliTag} dev -p 4005 --no-studio --route /api/webhooks/novu --run "next dev --port=4005"`
    : `PORT=4005 npx novu@${cliTag} dev -p 4005 --no-studio --run "next dev --port=4005"`;

  return scripts;
}

function buildScaffoldPackageJson(args: InstallTemplateArgs, agent: AgentInstallContext): ScaffoldPackageJson {
  const { appName, template, mode, eslint } = args;
  const packageJson: ScaffoldPackageJson = {
    name: appName,
    version: '0.1.0',
    private: true,
    scripts: buildTemplateScripts(args.packageManager, agent),
    dependencies: buildTemplateDependencies(args, agent),
    devDependencies: {},
  };

  if (mode === 'ts') {
    packageJson.devDependencies = {
      ...packageJson.devDependencies,
      typescript: '^5',
      '@types/node': '^22',
      '@types/react': '^19',
      '@types/react-dom': '^19',
    };
  }

  if (template === TemplateTypeEnum.APP_REACT_EMAIL) {
    packageJson.devDependencies = {
      ...packageJson.devDependencies,
      postcss: '^8',
      tailwindcss: '^3.4.1',
    };
    packageJson.dependencies = {
      ...packageJson.dependencies,
      '@react-email/components': '0.0.18',
      '@react-email/tailwind': '0.0.18',
      zod: '^3.23.8',
      'zod-to-json-schema': '^3.23.1',
    };
  }

  if (agent.isAgent) {
    packageJson.dependencies = {
      ...packageJson.dependencies,
      ...resolveAgentZodDependencies(),
    };
  }

  if (eslint) {
    packageJson.devDependencies = {
      ...packageJson.devDependencies,
      eslint: '^9',
      'eslint-config-next': NEXT_VERSION,
    };
  }

  if (template === TemplateTypeEnum.APP_AGENT_AI_SDK) {
    // chat (transitive via @novu/framework) peers ai@^6 for its own AI helpers.
    // Framework only uses chat for card components; ai-sdk scaffold installs ai@7.
    packageJson.pnpm = {
      peerDependencyRules: {
        allowedVersions: {
          'chat>ai': '7',
        },
      },
    };
  }

  if (!Object.keys(packageJson.devDependencies ?? {}).length) {
    delete packageJson.devDependencies;
  }

  return packageJson;
}

function logDependencyPlan(packageJson: ScaffoldPackageJson, silent?: boolean): void {
  if (silent) return;

  console.log('\nInstalling dependencies:');
  for (const dependency in packageJson.dependencies) console.log(`- ${cyan(dependency)}`);

  if (packageJson.devDependencies) {
    console.log('\nInstalling devDependencies:');
    for (const dependency in packageJson.devDependencies) console.log(`- ${cyan(dependency)}`);
  }

  console.log();
}

/**
 * Get the file path for a given file in a template, e.g. "next.config.js".
 */
export const getTemplateFile = ({ template, mode, file }: GetTemplateFileArgs): string => {
  return path.join(TEMPLATES_DIR, template, mode, file);
};

export const SRC_DIR_NAMES = ['app', 'pages', 'styles'];

/**
 * Install a Next.js internal template to a given `root` directory.
 */
export const installTemplate = async (args: InstallTemplateArgs) => {
  const {
    root,
    packageManager,
    isOnline,
    template,
    mode,
    eslint,
    srcDir,
    importAlias,
    agentIdentifier,
    silent,
    skipInstall,
    llmAuth,
  } = args;

  if (!silent) console.log(bold(`Using ${packageManager}.`));
  if (!silent) console.log('\nInitializing project with template:', template, '\n');

  const agent = resolveAgentContext(template, agentIdentifier);
  if (agent.renameAgent) assertValidAgentIdentifier(agent.renameAgent);

  const copySource = buildCopySource(template, mode, eslint);
  await copyTemplateFiles(root, path.join(TEMPLATES_DIR, template, mode), copySource, agent.renameAgent);

  if (agent.renameAgent) await rewriteAgentNameInFiles(root, agent.renameAgent);
  if (agent.renameAgent && llmAuth) {
    await writeLlmAuthAgentSource(root, agent, agent.renameAgent, llmAuth);
  }
  await writeAgentNextConfig(root, agent, llmAuth);
  await applyImportAlias(root, srcDir, importAlias);
  if (srcDir) await relocateToSrcDir(root, template, mode);

  const envVars = buildEnvVars(args, agent);
  const envFile = Object.entries(envVars).reduce((acc, [key, value]) => `${acc}${key}=${value}${os.EOL}`, '');
  await fs.writeFile(path.join(root, '.env.local'), envFile);

  if (!agent.isAgent && !agent.isChatSdk) {
    await copy(copySource, `${root}/.github`, {
      parents: true,
      cwd: path.join(TEMPLATES_DIR, `./github`),
    });
  }

  const packageJson = buildScaffoldPackageJson(args, agent);
  await fs.writeFile(path.join(root, 'package.json'), JSON.stringify(packageJson, null, 2) + os.EOL);
  logDependencyPlan(packageJson, silent);

  if (!skipInstall) {
    await install(packageManager, isOnline, silent, root);
  }
};

export * from './types';
