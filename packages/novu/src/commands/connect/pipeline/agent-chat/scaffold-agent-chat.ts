import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { tryGitInit } from '../../../init/helpers/git';
import { isFolderEmpty } from '../../../init/helpers/is-folder-empty';
import { getOnline } from '../../../init/helpers/is-online';
import { detectBridgeProject } from '../bridge/detect-project';

export type ScaffoldAgentChatProjectInput = {
  parentDir: string;
  appName?: string;
  agentIdentifier: string;
  applicationIdentifier: string;
  subscriberId: string;
  apiUrl: string;
  /** When set, merge chat UI into an existing bridge scaffold instead of creating a sibling app. */
  mergeIntoProjectDir?: string;
  /** Replace the root page when merging into a project scaffolded during this connect run. */
  mergeAtRoot?: boolean;
};

export type ScaffoldAgentChatProjectResult = {
  projectDir: string;
  appName: string;
  scaffolded: boolean;
  mergedIntoBridge: boolean;
};

const TEMPLATE_ROOT = path.join(__dirname, '../../templates/agent-chat/ts');

export function defaultAgentChatScaffoldDirName(agentIdentifier: string): string {
  return `${agentIdentifier}-agent-chat`;
}

export async function scaffoldAgentChatProject(
  input: ScaffoldAgentChatProjectInput
): Promise<ScaffoldAgentChatProjectResult> {
  const mergeTarget = input.mergeIntoProjectDir?.trim();
  if (mergeTarget) {
    await mergeAgentChatIntoProject(mergeTarget, input);

    return {
      projectDir: mergeTarget,
      appName: path.basename(mergeTarget),
      scaffolded: true,
      mergedIntoBridge: true,
    };
  }

  const parentDir = path.resolve(input.parentDir);
  const appName = input.appName?.trim() || defaultAgentChatScaffoldDirName(input.agentIdentifier);
  const root = path.join(parentDir, appName);

  if (fs.existsSync(root) && !isFolderEmpty(root, appName)) {
    throw new Error(`Cannot scaffold Agent Chat into "${root}" — the directory is not empty.`);
  }

  fs.mkdirSync(root, { recursive: true });
  await writeStandaloneAgentChatApp(root, input);
  tryGitInit(root);

  return { projectDir: root, appName, scaffolded: true, mergedIntoBridge: false };
}

async function mergeAgentChatIntoProject(projectDir: string, input: ScaffoldAgentChatProjectInput): Promise<void> {
  const resolved = path.resolve(projectDir);
  if (!fs.existsSync(path.join(resolved, 'package.json'))) {
    throw new Error(`Cannot merge Agent Chat into "${resolved}" — no package.json found.`);
  }

  const dependenciesChanged = ensureAgentChatDependencies(resolved, findLocalNovuDeps());
  const componentsDir = path.join(resolved, 'components', 'agent-chat');
  fs.mkdirSync(componentsDir, { recursive: true });
  copyTemplateComponents(componentsDir);

  const chatPageDir = input.mergeAtRoot ? path.join(resolved, 'app') : path.join(resolved, 'app', 'agent-chat');
  fs.mkdirSync(chatPageDir, { recursive: true });
  fs.writeFileSync(
    path.join(chatPageDir, 'page.tsx'),
    renderChatPage({ standalone: false, configImport: '../config' }),
    'utf8'
  );

  appendEnvExample(resolved, input);
  const configPath = path.join(resolved, 'config.ts');
  if (!fs.existsSync(configPath)) {
    fs.writeFileSync(
      configPath,
      renderConfigModule({
        applicationIdentifier: input.applicationIdentifier,
        subscriberId: input.subscriberId,
        agentIdentifier: input.agentIdentifier,
        apiUrl: input.apiUrl,
      }),
      'utf8'
    );
  }

  if (dependenciesChanged && (await getOnline())) {
    execFileSync(resolvePackageManager(resolved), ['install'], { cwd: resolved, stdio: 'inherit' });
  }
}

function ensureAgentChatDependencies(projectDir: string, localNovuDeps: LocalNovuDeps | undefined): boolean {
  const packageJsonPath = path.join(projectDir, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')) as {
    dependencies?: Record<string, string>;
    scripts?: Record<string, string>;
  };
  const dependencies = packageJson.dependencies ?? {};
  const required = {
    '@novu/react': resolveNovuReactDependency(localNovuDeps),
    ...(localNovuDeps ? { '@novu/js': `file:${localNovuDeps.jsDir}` } : {}),
    'react-markdown': '^10.1.0',
    'remark-gfm': '^4.0.1',
  };
  let changed = false;

  for (const [name, version] of Object.entries(required)) {
    if (dependencies[name] !== version) {
      dependencies[name] = version;
      changed = true;
    }
  }

  if (localNovuDeps && packageJson.scripts) {
    for (const [name, script] of Object.entries(packageJson.scripts)) {
      const usesNextDev = script.includes('next dev') && !script.includes('next dev --webpack');
      const usesNextBuild = script.includes('next build') && !script.includes('next build --webpack');
      if (!usesNextDev && !usesNextBuild) continue;

      packageJson.scripts[name] = script
        .replace(/next dev(?=\s|$)/g, 'next dev --webpack')
        .replace(/next build(?=\s|$)/g, 'next build --webpack');
      changed = true;
    }
  }

  if (changed) {
    packageJson.dependencies = dependencies;
    fs.writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`, 'utf8');
  }

  return changed;
}

function resolvePackageManager(projectDir: string): 'npm' | 'pnpm' | 'yarn' | 'bun' {
  if (fs.existsSync(path.join(projectDir, 'pnpm-lock.yaml'))) return 'pnpm';
  if (fs.existsSync(path.join(projectDir, 'yarn.lock'))) return 'yarn';
  if (fs.existsSync(path.join(projectDir, 'bun.lock')) || fs.existsSync(path.join(projectDir, 'bun.lockb'))) {
    return 'bun';
  }

  return 'npm';
}

async function writeStandaloneAgentChatApp(root: string, input: ScaffoldAgentChatProjectInput): Promise<void> {
  fs.mkdirSync(path.join(root, 'app'), { recursive: true });
  fs.mkdirSync(path.join(root, 'components', 'agent-chat'), { recursive: true });

  const localNovuDeps = findLocalNovuDeps();

  copyTemplateComponents(path.join(root, 'components', 'agent-chat'));

  fs.writeFileSync(path.join(root, 'app', 'layout.tsx'), STANDALONE_LAYOUT, 'utf8');
  fs.writeFileSync(
    path.join(root, 'app', 'page.tsx'),
    renderChatPage({ standalone: true, configImport: '../config' }),
    'utf8'
  );
  fs.writeFileSync(
    path.join(root, 'config.ts'),
    renderConfigModule({
      applicationIdentifier: input.applicationIdentifier,
      subscriberId: input.subscriberId,
      agentIdentifier: input.agentIdentifier,
      apiUrl: input.apiUrl,
    }),
    'utf8'
  );
  fs.writeFileSync(
    path.join(root, 'package.json'),
    renderPackageJson(path.basename(root), root, localNovuDeps),
    'utf8'
  );
  fs.writeFileSync(path.join(root, 'tsconfig.json'), STANDALONE_TSCONFIG, 'utf8');
  fs.writeFileSync(path.join(root, 'next.config.mjs'), renderNextConfig(root, localNovuDeps), 'utf8');
  fs.writeFileSync(path.join(root, '.env.local'), renderEnvLocal(input), 'utf8');
  fs.writeFileSync(path.join(root, '.env.example'), renderEnvExample(input), 'utf8');
  fs.writeFileSync(path.join(root, '.gitignore'), STANDALONE_GITIGNORE, 'utf8');

  const isOnline = await getOnline();
  if (isOnline) {
    const { execSync } = await import('node:child_process');
    execSync('npm install', { cwd: root, stdio: 'inherit' });
  }
}

function copyTemplateComponents(targetDir: string): void {
  for (const file of fs.readdirSync(TEMPLATE_ROOT)) {
    if (!file.endsWith('.tsx') && !file.endsWith('.css') && !file.endsWith('.ts')) continue;
    fs.copyFileSync(path.join(TEMPLATE_ROOT, file), path.join(targetDir, file));
  }
}

function renderChatPage(opts: { standalone: boolean; configImport: string }): string {
  if (opts.standalone) {
    return `'use client';

import { NovuProvider } from '@novu/react';
import { AgentChat } from '@/components/agent-chat/agent-chat';
import { config } from '@/config';
import '@/components/agent-chat/globals.css';

export default function Page() {
  return (
    <NovuProvider
      applicationIdentifier={config.applicationIdentifier}
      subscriberId={config.subscriberId}
      apiUrl={config.backendUrl}
      socketUrl={config.socketUrl}
    >
      <main className="novu-agent-chat agent-chat-page">
        <AgentChat />
      </main>
    </NovuProvider>
  );
}
`;
  }

  return `'use client';

import { NovuProvider } from '@novu/react';
import { AgentChat } from '@/components/agent-chat/agent-chat';
import '@/components/agent-chat/globals.css';

export default function AgentChatPage() {
  const applicationIdentifier = process.env.NEXT_PUBLIC_NOVU_APP_ID ?? '';
  const subscriberId = process.env.NEXT_PUBLIC_NOVU_SUBSCRIBER_ID ?? '';
  const apiUrl = process.env.NEXT_PUBLIC_NOVU_BACKEND_URL ?? 'http://localhost:3000';
  const socketUrl = process.env.NEXT_PUBLIC_NOVU_SOCKET_URL;

  return (
    <NovuProvider applicationIdentifier={applicationIdentifier} subscriberId={subscriberId} apiUrl={apiUrl} socketUrl={socketUrl}>
      <main className="novu-agent-chat agent-chat-page">
        <AgentChat />
      </main>
    </NovuProvider>
  );
}
`;
}

function renderConfigModule(input: {
  applicationIdentifier: string;
  subscriberId: string;
  agentIdentifier: string;
  apiUrl: string;
}): string {
  return `export const config = {
  applicationIdentifier: process.env.NEXT_PUBLIC_NOVU_APP_ID ?? '${escapeJs(input.applicationIdentifier)}',
  subscriberId: process.env.NEXT_PUBLIC_NOVU_SUBSCRIBER_ID ?? '${escapeJs(input.subscriberId)}',
  agentId: process.env.NEXT_PUBLIC_NOVU_AGENT_ID ?? '${escapeJs(input.agentIdentifier)}',
  backendUrl: process.env.NEXT_PUBLIC_NOVU_BACKEND_URL ?? '${escapeJs(input.apiUrl)}',
  socketUrl: process.env.NEXT_PUBLIC_NOVU_SOCKET_URL,
} as const;
`;
}

function renderEnvLocal(input: ScaffoldAgentChatProjectInput): string {
  return renderEnvExample(input).replace('# Copy to .env.local', '');
}

function renderEnvExample(input: ScaffoldAgentChatProjectInput): string {
  return `# Copy to .env.local
NEXT_PUBLIC_NOVU_APP_ID=${input.applicationIdentifier}
NEXT_PUBLIC_NOVU_SUBSCRIBER_ID=${input.subscriberId}
NEXT_PUBLIC_NOVU_AGENT_ID=${input.agentIdentifier}
NEXT_PUBLIC_NOVU_BACKEND_URL=${input.apiUrl.replace(/\/$/, '')}
`;
}

function appendEnvExample(projectDir: string, input: ScaffoldAgentChatProjectInput): void {
  const envPath = path.join(projectDir, '.env.local');
  const block = `\n# Agent Chat (added by npx novu connect)\nNEXT_PUBLIC_NOVU_APP_ID=${input.applicationIdentifier}\nNEXT_PUBLIC_NOVU_SUBSCRIBER_ID=${input.subscriberId}\nNEXT_PUBLIC_NOVU_AGENT_ID=${input.agentIdentifier}\nNEXT_PUBLIC_NOVU_BACKEND_URL=${input.apiUrl.replace(/\/$/, '')}\n`;
  if (fs.existsSync(envPath)) {
    fs.appendFileSync(envPath, block, 'utf8');
  } else {
    fs.writeFileSync(envPath, `${renderEnvExample(input)}${block}`, 'utf8');
  }
}

function findMonorepoReactPackageDir(): string | undefined {
  let dir = __dirname;
  for (let depth = 0; depth < 12; depth++) {
    const candidate = path.join(dir, 'packages', 'react', 'package.json');
    if (fs.existsSync(candidate)) {
      return path.dirname(candidate);
    }

    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  return undefined;
}

type LocalNovuDeps = {
  reactDir: string;
  jsDir: string;
};

function findLocalNovuDeps(): LocalNovuDeps | undefined {
  const reactDir = findMonorepoReactPackageDir();
  if (!reactDir) {
    return undefined;
  }

  const jsDir = path.join(path.dirname(reactDir), 'js');
  if (!fs.existsSync(path.join(jsDir, 'package.json'))) {
    return undefined;
  }

  return { reactDir, jsDir };
}

function toPosixRelative(from: string, to: string): string {
  const rel = path.relative(from, to).split(path.sep).join('/');
  return rel.startsWith('.') ? rel : `./${rel}`;
}

function resolveNovuReactDependency(localNovuDeps: LocalNovuDeps | undefined): string {
  if (localNovuDeps) {
    return `file:${localNovuDeps.reactDir}`;
  }

  return 'latest';
}

function renderPackageJson(name: string, scaffoldRoot: string, localNovuDeps: LocalNovuDeps | undefined): string {
  const usesLocalNovu = Boolean(localNovuDeps);

  return JSON.stringify(
    {
      name,
      private: true,
      scripts: {
        dev: usesLocalNovu ? 'next dev -p 4012 --webpack' : 'next dev -p 4012',
        build: usesLocalNovu ? 'next build --webpack' : 'next build',
        start: 'next start -p 4012',
      },
      dependencies: {
        '@novu/react': resolveNovuReactDependency(localNovuDeps),
        next: '^16.2.11',
        react: '^18.3.1',
        'react-dom': '^18.3.1',
        'react-markdown': '^10.1.0',
        'remark-gfm': '^4.0.1',
      },
      devDependencies: {
        '@types/node': '^22.0.0',
        '@types/react': '^19.0.0',
        '@types/react-dom': '^19.0.0',
        typescript: '5.6.2',
      },
    },
    null,
    2
  );
}

function renderNextConfig(scaffoldRoot: string, localNovuDeps: LocalNovuDeps | undefined): string {
  if (!localNovuDeps) {
    return STANDALONE_NEXT_CONFIG;
  }

  const reactRel = toPosixRelative(scaffoldRoot, localNovuDeps.reactDir);
  const jsRel = toPosixRelative(scaffoldRoot, localNovuDeps.jsDir);

  return `import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const novuReact = path.resolve(__dirname, '${reactRel}');
const novuJs = path.resolve(__dirname, '${jsRel}');

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@novu/react', '@novu/js'],
  // Turbopack cannot resolve file: symlinks outside the app root — webpack aliases
  // point at the local monorepo packages when connect scaffolds from a dev checkout.
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@novu/react': novuReact,
      '@novu/js': novuJs,
    };

    return config;
  },
};

export default nextConfig;
`;
}

function escapeJs(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

export function detectAgentChatProjectKind(projectDir: string): 'empty' | 'project' {
  return detectBridgeProject(projectDir).kind;
}

const STANDALONE_LAYOUT = `import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'], display: 'swap' });

export const metadata = {
  title: 'Novu Agent Chat',
  description: 'A standalone Agent Chat example powered by Novu.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning style={{ margin: 0 }}>
        {children}
      </body>
    </html>
  );
}
`;

const STANDALONE_TSCONFIG = JSON.stringify(
  {
    compilerOptions: {
      target: 'ES2017',
      lib: ['dom', 'dom.iterable', 'esnext'],
      allowJs: true,
      skipLibCheck: true,
      strict: true,
      noEmit: true,
      esModuleInterop: true,
      module: 'esnext',
      moduleResolution: 'bundler',
      resolveJsonModule: true,
      isolatedModules: true,
      jsx: 'preserve',
      incremental: true,
      plugins: [{ name: 'next' }],
      paths: { '@/*': ['./*'] },
    },
    include: ['next-env.d.ts', '**/*.ts', '**/*.tsx'],
    exclude: ['node_modules'],
  },
  null,
  2
);

const STANDALONE_NEXT_CONFIG = `/** @type {import('next').NextConfig} */
const nextConfig = {};
export default nextConfig;
`;

const STANDALONE_GITIGNORE = `.next\nnode_modules\n.env.local\n`;
