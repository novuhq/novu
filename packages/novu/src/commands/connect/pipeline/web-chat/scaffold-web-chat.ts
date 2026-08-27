import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { getNovuScaffoldSdkTag } from '@novu/shared';
import { CloudRegionEnum } from '../../../dev/enums';
import { tryGitInit } from '../../../init/helpers/git';
import { isFolderEmpty } from '../../../init/helpers/is-folder-empty';
import { getOnline } from '../../../init/helpers/is-online';
import { detectBridgeProject } from '../bridge/detect-project';
import { buildWebChatEnvEntries, mergeWebChatEnv } from './wire-web-chat-env';

export type ScaffoldWebChatProjectInput = {
  parentDir: string;
  appName?: string;
  agentIdentifier: string;
  applicationIdentifier: string;
  subscriberId: string;
  apiUrl: string;
  region?: CloudRegionEnum;
  /** When set, merge chat UI into an existing bridge scaffold instead of creating a sibling app. */
  mergeIntoProjectDir?: string;
  /** Replace the root page when merging into a project scaffolded during this connect run. */
  mergeAtRoot?: boolean;
};

export type ScaffoldWebChatProjectResult = {
  projectDir: string;
  appName: string;
  scaffolded: boolean;
  mergedIntoBridge: boolean;
  /** Browser path where Web Chat is served inside the app. */
  chatPath: string;
};

/**
 * Templates live at <build root>/commands/connect/templates/web-chat/ts.
 * Under the module layout (tsc output or ts-node dev) `__dirname` is this
 * file's directory; from the bundled CLI entry it is `dist/src` — try both.
 */
function resolveTemplateRoot(): string {
  const candidates = [
    path.join(__dirname, '../../templates/web-chat/ts'),
    path.join(__dirname, 'commands/connect/templates/web-chat/ts'),
  ];

  return candidates.find((candidate) => fs.existsSync(candidate)) ?? candidates[0];
}

const TEMPLATE_ROOT = resolveTemplateRoot();

export function defaultWebChatScaffoldDirName(agentIdentifier: string): string {
  return `${agentIdentifier}-web-chat`;
}

export function assertSafeScaffoldDirectoryName(name: string): void {
  if (path.isAbsolute(name) || path.basename(name) !== name || name === '.' || name === '..') {
    throw new Error(`Invalid scaffold directory name "${name}". Use a single relative directory name.`);
  }
}

function resolveScaffoldAppName(input: ScaffoldWebChatProjectInput): string {
  const appName = input.appName?.trim() || defaultWebChatScaffoldDirName(input.agentIdentifier);
  assertSafeScaffoldDirectoryName(appName);

  return appName;
}

export async function scaffoldWebChatProject(
  input: ScaffoldWebChatProjectInput
): Promise<ScaffoldWebChatProjectResult> {
  const mergeTarget = input.mergeIntoProjectDir?.trim();
  if (mergeTarget) {
    await mergeWebChatIntoProject(mergeTarget, input);
    const chatPath = input.mergeAtRoot ? '/' : '/web-chat';

    return {
      projectDir: mergeTarget,
      appName: path.basename(mergeTarget),
      scaffolded: true,
      mergedIntoBridge: true,
      chatPath,
    };
  }

  const parentDir = path.resolve(input.parentDir);
  const appName = resolveScaffoldAppName(input);
  const root = path.join(parentDir, appName);

  if (fs.existsSync(root) && !isFolderEmpty(root, appName)) {
    throw new Error(`Cannot scaffold Web Chat into "${root}" — the directory is not empty.`);
  }

  fs.mkdirSync(root, { recursive: true });
  await writeStandaloneWebChatApp(root, input);
  tryGitInit(root);

  return { projectDir: root, appName, scaffolded: true, mergedIntoBridge: false, chatPath: '/' };
}

async function mergeWebChatIntoProject(projectDir: string, input: ScaffoldWebChatProjectInput): Promise<void> {
  const resolved = path.resolve(projectDir);
  if (!fs.existsSync(path.join(resolved, 'package.json'))) {
    throw new Error(`Cannot merge Web Chat into "${resolved}" — no package.json found.`);
  }

  const dependenciesChanged = ensureWebChatDependencies(resolved, input.apiUrl, input.region);
  const componentsDir = path.join(resolved, 'components', 'web-chat');
  fs.mkdirSync(componentsDir, { recursive: true });
  copyTemplateComponents(componentsDir);

  const chatPageDir = input.mergeAtRoot ? path.join(resolved, 'app') : path.join(resolved, 'app', 'web-chat');
  fs.mkdirSync(chatPageDir, { recursive: true });
  fs.writeFileSync(
    path.join(chatPageDir, 'page.tsx'),
    renderChatPage({ standalone: false, configImport: '../config' }),
    'utf8'
  );

  appendEnvExample(resolved, input);

  if (dependenciesChanged && (await getOnline())) {
    execFileSync(resolvePackageManager(resolved), ['install'], { cwd: resolved, stdio: 'inherit' });
  }
}

function ensureWebChatDependencies(projectDir: string, apiUrl: string, region?: CloudRegionEnum): boolean {
  const packageJsonPath = path.join(projectDir, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')) as {
    dependencies?: Record<string, string>;
    scripts?: Record<string, string>;
  };
  const dependencies = packageJson.dependencies ?? {};
  const sdk = resolveWebChatNovuDependencies(apiUrl, region);
  const required = {
    '@novu/react': sdk.react,
    ...(sdk.js ? { '@novu/js': sdk.js } : {}),
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

async function writeStandaloneWebChatApp(root: string, input: ScaffoldWebChatProjectInput): Promise<void> {
  fs.mkdirSync(path.join(root, 'app'), { recursive: true });
  fs.mkdirSync(path.join(root, 'components', 'web-chat'), { recursive: true });

  copyTemplateComponents(path.join(root, 'components', 'web-chat'));

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
  const sdk = resolveWebChatNovuDependencies(input.apiUrl, input.region);
  fs.writeFileSync(path.join(root, 'package.json'), renderPackageJson(path.basename(root), sdk), 'utf8');
  fs.writeFileSync(path.join(root, 'tsconfig.json'), STANDALONE_TSCONFIG, 'utf8');
  fs.writeFileSync(path.join(root, 'next.config.mjs'), STANDALONE_NEXT_CONFIG, 'utf8');
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
import { WebChat } from '@/components/web-chat/web-chat';
import { config } from '@/config';
import '@/components/web-chat/globals.css';

export default function Page() {
  return (
    <NovuProvider
      applicationIdentifier={config.applicationIdentifier}
      subscriberId={config.subscriberId}
      apiUrl={config.backendUrl}
      socketUrl={config.socketUrl}
    >
      <main className="novu-web-chat web-chat-page">
        <WebChat />
      </main>
    </NovuProvider>
  );
}
`;
  }

  return `'use client';

import { Inter } from 'next/font/google';
import { NovuProvider } from '@novu/react';
import { WebChat } from '@/components/web-chat/web-chat';
import '@/components/web-chat/globals.css';

const inter = Inter({ subsets: ['latin'], display: 'swap' });

export default function WebChatPage() {
  const applicationIdentifier = process.env.NEXT_PUBLIC_NOVU_APP_ID ?? '';
  const subscriberId = process.env.NEXT_PUBLIC_NOVU_SUBSCRIBER_ID ?? '';
  const apiUrl = process.env.NEXT_PUBLIC_NOVU_BACKEND_URL ?? 'http://localhost:3000';
  const socketUrl = process.env.NEXT_PUBLIC_NOVU_SOCKET_URL;

  return (
    <NovuProvider applicationIdentifier={applicationIdentifier} subscriberId={subscriberId} apiUrl={apiUrl} socketUrl={socketUrl}>
      <main className={\`novu-web-chat web-chat-page \${inter.className}\`}>
        <WebChat />
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

function renderEnvExample(input: ScaffoldWebChatProjectInput): string {
  const entries = buildWebChatEnvEntries({
    projectDir: '',
    applicationIdentifier: input.applicationIdentifier,
    subscriberId: input.subscriberId,
    agentIdentifier: input.agentIdentifier,
    apiUrl: input.apiUrl,
  });
  const lines = ['# Copy to .env.local', '# Web Chat (added by npx novu connect)'];
  for (const [key, value] of Object.entries(entries)) {
    lines.push(`${key}=${value}`);
  }

  return `${lines.join('\n')}\n`;
}

function renderEnvLocal(input: ScaffoldWebChatProjectInput): string {
  return renderEnvExample(input).replace('# Copy to .env.local\n', '');
}

function appendEnvExample(projectDir: string, input: ScaffoldWebChatProjectInput): void {
  mergeWebChatEnv({
    projectDir,
    applicationIdentifier: input.applicationIdentifier,
    subscriberId: input.subscriberId,
    agentIdentifier: input.agentIdentifier,
    apiUrl: input.apiUrl,
  });
}

export type WebChatNovuDependencies = {
  react: string;
  js?: string;
};

export function resolveWebChatNovuDependencies(apiUrl: string, region?: CloudRegionEnum): WebChatNovuDependencies {
  const tag = getNovuScaffoldSdkTag(apiUrl, region);

  return { react: tag, js: tag };
}

function renderPackageJson(name: string, sdk: WebChatNovuDependencies): string {
  return JSON.stringify(
    {
      name,
      private: true,
      scripts: {
        dev: 'next dev -p 4012',
        build: 'next build',
        start: 'next start -p 4012',
      },
      dependencies: {
        '@novu/react': sdk.react,
        ...(sdk.js ? { '@novu/js': sdk.js } : {}),
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

function escapeJs(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

export function detectWebChatProjectKind(projectDir: string): 'empty' | 'project' {
  return detectBridgeProject(projectDir).kind;
}

const STANDALONE_LAYOUT = `import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'], display: 'swap' });

export const metadata = {
  title: 'Novu Web Chat',
  description: 'A standalone Web Chat example powered by Novu.',
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
