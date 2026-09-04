import fs from 'node:fs';
import path from 'node:path';
import { getNovuScaffoldSdkTag, isNovuLocalApiUrl } from '@novu/shared';
import { yellow } from 'picocolors';
import { CloudRegionEnum } from '../../../dev/enums';
import { tryGitInit } from '../../../init/helpers/git';
import { install } from '../../../init/helpers/install';
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
 * Official Web Chat connect template at <build root>/commands/connect/templates/web-chat/ts.
 * Edit the template in-repo directly — it is not synced from playground/web-chat.
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
  ensureWebChatNextConfig(resolved);
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

  if (input.mergeAtRoot) {
    ensureWebChatGlobalsImport(resolved);
  }

  appendEnvExample(resolved, input);

  if (dependenciesChanged && (await getOnline())) {
    await install(resolvePackageManager(resolved), true, false, resolved);
  }
}

function ensureWebChatDependencies(projectDir: string, apiUrl: string, region?: CloudRegionEnum): boolean {
  const packageJsonPath = path.join(projectDir, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
    scripts?: Record<string, string>;
  };
  const dependencies = packageJson.dependencies ?? {};
  const sdk = resolveWebChatNovuDependenciesForProject(projectDir, apiUrl, region);
  const required = webChatRuntimeDependencies(sdk);
  let changed = false;

  for (const [name, version] of Object.entries(required)) {
    if (dependencies[name] !== version) {
      dependencies[name] = version;
      changed = true;
    }
  }

  const devDependencies = packageJson.devDependencies ?? {};
  for (const [name, version] of Object.entries(WEB_CHAT_DEV_DEPENDENCIES)) {
    if (devDependencies[name] !== version) {
      devDependencies[name] = version;
      changed = true;
    }
  }

  if (changed) {
    packageJson.dependencies = dependencies;
    packageJson.devDependencies = devDependencies;
    fs.writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`, 'utf8');
  }

  const postcssUpgraded = ensureWebChatPostcssConfig(projectDir);
  if (postcssUpgraded) {
    migrateHostTailwindCss(projectDir);
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
  const sdk = resolveWebChatNovuDependenciesForProject(root, input.apiUrl, input.region);
  fs.writeFileSync(path.join(root, 'package.json'), renderPackageJson(path.basename(root), sdk), 'utf8');
  fs.writeFileSync(path.join(root, 'tsconfig.json'), STANDALONE_TSCONFIG, 'utf8');
  fs.writeFileSync(path.join(root, 'next.config.mjs'), WEB_CHAT_NEXT_CONFIG, 'utf8');
  fs.writeFileSync(path.join(root, 'postcss.config.mjs'), STANDALONE_POSTCSS_CONFIG, 'utf8');
  fs.writeFileSync(path.join(root, '.env.local'), renderEnvLocal(input), 'utf8');
  fs.writeFileSync(path.join(root, '.env.example'), renderEnvExample(input), 'utf8');
  fs.writeFileSync(path.join(root, '.gitignore'), STANDALONE_GITIGNORE, 'utf8');

  const isOnline = await getOnline();
  if (isOnline) {
    await install('npm', isOnline, false, root);
  }
}

function copyTemplateComponents(targetDir: string): void {
  copyTemplateDir(TEMPLATE_ROOT, targetDir);
}

function copyTemplateDir(from: string, to: string): void {
  fs.mkdirSync(to, { recursive: true });

  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const source = path.join(from, entry.name);
    const destination = path.join(to, entry.name);

    if (entry.isDirectory()) {
      copyTemplateDir(source, destination);
      continue;
    }

    if (!/\.(tsx?|jsx?|css)$/.test(entry.name)) {
      continue;
    }

    fs.copyFileSync(source, destination);
  }
}

/**
 * The AI SDK Next template leaves an unlayered `* { padding: 0 }` reset.
 * Tailwind utilities live in `@layer utilities`, so that reset wins and
 * zeros composer / chip / button spacing after a root merge.
 */
export function stripUnlayeredUniversalReset(css: string): string {
  return css
    .replace(/(\*,\s*\*::before,\s*\*::after\s*\{)([\s\S]*?)(\})/g, (match, open, body, close) => {
      if (!/(?:padding|margin)\s*:\s*0/.test(body)) {
        return match;
      }

      const stripped = body
        .replace(/\b(?:padding|margin)\s*:\s*0\s*;?\s*/g, '')
        .replace(/\s{2,}/g, ' ')
        .replace(/;\s*;/g, ';')
        .trim();

      if (!stripped) {
        return '';
      }

      const separator = body.startsWith('\n') ? '\n' : ' ';
      return `${open}${separator}${stripped}${separator}${close}`;
    })
    .replace(/\n{3,}/g, '\n\n');
}

const HOST_GLOBALS_CSS_PATHS = ['src/app/globals.css', 'app/globals.css', 'styles/globals.css'] as const;

function findHostGlobalsCssPath(projectDir: string): string | null {
  for (const relativePath of HOST_GLOBALS_CSS_PATHS) {
    const candidate = path.join(projectDir, relativePath);
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

function webChatGlobalsImportLine(projectDir: string, globalsPath: string): string {
  const relativeImport = path
    .relative(path.dirname(globalsPath), path.join(projectDir, 'components/web-chat/globals.css'))
    .replace(/\\/g, '/');

  return `@import '${relativeImport}';`;
}

function ensureWebChatGlobalsImport(projectDir: string): void {
  const globalsPath = findHostGlobalsCssPath(projectDir) ?? path.join(projectDir, 'app', 'globals.css');
  const importLine = webChatGlobalsImportLine(projectDir, globalsPath);

  if (fs.existsSync(globalsPath)) {
    const original = fs.readFileSync(globalsPath, 'utf8');
    let next = original;
    if (!next.includes('components/web-chat/globals.css')) {
      const migrated = migrateLegacyTailwindDirectives(next);
      if (migrated) {
        next = migrated;
      }

      next = `${importLine}\n${next}`;
    }

    next = stripUnlayeredUniversalReset(next);
    if (next !== original) {
      fs.writeFileSync(globalsPath, next, 'utf8');
    }

    return;
  }

  fs.mkdirSync(path.dirname(globalsPath), { recursive: true });
  fs.writeFileSync(globalsPath, `${importLine}\n`, 'utf8');
}

function migrateHostTailwindCss(projectDir: string): void {
  for (const relativePath of HOST_GLOBALS_CSS_PATHS) {
    const globalsPath = path.join(projectDir, relativePath);
    if (!fs.existsSync(globalsPath)) {
      continue;
    }

    const source = fs.readFileSync(globalsPath, 'utf8');
    const migrated = migrateLegacyTailwindDirectives(source);
    if (migrated) {
      fs.writeFileSync(globalsPath, migrated, 'utf8');
    }
  }
}

/** Tailwind 4 uses `@import "tailwindcss"` instead of `@tailwind base/components/utilities`. */
function migrateLegacyTailwindDirectives(css: string): string | null {
  if (!/@tailwind\s+(base|components|utilities)/.test(css)) {
    return null;
  }

  if (css.includes("@import 'tailwindcss'") || css.includes('@import "tailwindcss"')) {
    return null;
  }

  const stripped = css.replace(/@tailwind\s+(base|components|utilities)\s*;\s*\n?/g, '').trimStart();
  return `@import "tailwindcss";\n\n${stripped}`;
}

const NEXT_CONFIG_FILENAMES = ['next.config.ts', 'next.config.js', 'next.config.mjs', 'next.config.cjs'] as const;

const WEB_CHAT_TRANSPILE_PACKAGES = ['@novu/react', '@novu/js', '@assistant-ui/react'] as const;

function findNextConfigPath(projectDir: string): string | null {
  for (const filename of NEXT_CONFIG_FILENAMES) {
    const configPath = path.join(projectDir, filename);
    if (fs.existsSync(configPath)) {
      return configPath;
    }
  }

  return null;
}

function patchNextConfigSource(source: string): string | null {
  const missingPackages = WEB_CHAT_TRANSPILE_PACKAGES.filter(
    (pkg) => !source.includes(`'${pkg}'`) && !source.includes(`"${pkg}"`)
  );

  if (missingPackages.length === 0) {
    return null;
  }

  const transpileArrayMatch = source.match(/transpilePackages\s*:\s*\[([\s\S]*?)\]/);
  if (transpileArrayMatch) {
    const inner = transpileArrayMatch[1].replace(/\/\/[^\n]*/g, '').trim();
    const additions = missingPackages.map((pkg) => `'${pkg}'`).join(', ');
    const mergedInner = inner ? `${inner.replace(/,\s*$/, '')}, ${additions}` : additions;

    return source.replace(transpileArrayMatch[0], `transpilePackages: [${mergedInner}]`);
  }

  const transpileRefMatch = source.match(/transpilePackages\s*:\s*([A-Za-z_$][\w$]*)/);
  if (transpileRefMatch) {
    const patched = patchTranspilePackagesVariable(source, transpileRefMatch[1], missingPackages);
    if (patched) {
      return patched;
    }
  }

  const insertion = `  transpilePackages: ${JSON.stringify([...missingPackages])},`;
  const markers = [
    'const nextConfig: NextConfig = {',
    "const nextConfig: import('next').NextConfig = {",
    'const nextConfig = {',
    'module.exports = {',
    'withBundleAnalyzer({',
    'withSentryConfig({',
    'withNextIntl({',
    'export default {',
  ];

  if (/module\.exports\s*=\s*\(\s*phase\b/.test(source) || /export\s+default\s*\(\s*phase\b/.test(source)) {
    markers.push('return {');
  }

  const hasTranspilePackages = /transpilePackages\s*:/.test(source);

  for (const marker of markers) {
    if (source.includes(marker)) {
      if (hasTranspilePackages) {
        break;
      }

      return source.replace(marker, `${marker}\n${insertion}`);
    }
  }

  const defaultExportId = source.match(/export\s+default\s+([A-Za-z_$][\w$]*)\s*;/);
  if (defaultExportId) {
    const patched = patchNextConfigVariableDefinition(source, defaultExportId[1], insertion);
    if (patched) {
      return patched;
    }
  }

  const cjsExportId = source.match(/module\.exports\s*=\s*([A-Za-z_$][\w$]*)\s*;/);
  if (cjsExportId) {
    const patched = patchNextConfigVariableDefinition(source, cjsExportId[1], insertion);
    if (patched) {
      return patched;
    }
  }

  return null;
}

function patchTranspilePackagesVariable(
  source: string,
  variableName: string,
  missingPackages: readonly string[]
): string | null {
  const arrayPattern = new RegExp(
    `((?:const|let|var)\\s+${variableName}(?:\\s*:\\s*[^=]+)?\\s*=\\s*\\[)([\\s\\S]*?)(\\])`
  );
  const match = source.match(arrayPattern);
  if (!match) {
    return null;
  }

  const inner = match[2].replace(/\/\/[^\n]*/g, '').trim();
  const additions = missingPackages.map((pkg) => `'${pkg}'`).join(', ');
  const mergedInner = inner ? `${inner.replace(/,\s*$/, '')}, ${additions}` : additions;

  return source.replace(match[0], `${match[1]}${mergedInner}${match[3]}`);
}

function patchNextConfigVariableDefinition(source: string, variableName: string, insertion: string): string | null {
  const variablePattern = new RegExp(`((?:const|let|var)\\s+${variableName}(?:\\s*:\\s*[^=]+)?\\s*=\\s*\\{)`);
  const match = source.match(variablePattern);
  if (!match) {
    return null;
  }

  return source.replace(match[0], `${match[0]}\n${insertion}`);
}

function upgradePostcssConfigSource(source: string): string | null {
  if (source.includes('@tailwindcss/postcss')) {
    return null;
  }

  if (!/\btailwindcss\b/.test(source)) {
    return null;
  }

  const upgraded = source
    .replace(/(['"])tailwindcss\1\s*:/g, "'@tailwindcss/postcss':")
    .replace(/\btailwindcss\s*:/g, "'@tailwindcss/postcss':")
    .replace(/require\(\s*(['"])tailwindcss\1\s*\)/g, "require('@tailwindcss/postcss')")
    .replace(/(\[\s*)(['"])tailwindcss\2/g, "$1'@tailwindcss/postcss'");

  return upgraded === source ? null : upgraded;
}

const POSTCSS_CONFIG_FILENAMES = ['postcss.config.mjs', 'postcss.config.js', 'postcss.config.cjs', 'postcss.config.ts'] as const;

function findPostcssConfigPath(projectDir: string): string | null {
  for (const filename of POSTCSS_CONFIG_FILENAMES) {
    const configPath = path.join(projectDir, filename);
    if (fs.existsSync(configPath)) {
      return configPath;
    }
  }

  return null;
}

function ensureWebChatPostcssConfig(projectDir: string): boolean {
  const existingPath = findPostcssConfigPath(projectDir);

  if (!existingPath) {
    fs.writeFileSync(path.join(projectDir, 'postcss.config.mjs'), STANDALONE_POSTCSS_CONFIG, 'utf8');
    return true;
  }

  const source = fs.readFileSync(existingPath, 'utf8');
  const upgraded = upgradePostcssConfigSource(source);
  if (!upgraded) {
    return false;
  }

  fs.writeFileSync(existingPath, upgraded, 'utf8');
  return true;
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
      <WebChat agentId={config.agentId} />
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
  const apiUrl = process.env.NEXT_PUBLIC_NOVU_BACKEND_URL;
  const socketUrl = process.env.NEXT_PUBLIC_NOVU_SOCKET_URL;

  return (
    <NovuProvider
      applicationIdentifier={applicationIdentifier}
      subscriberId={subscriberId}
      {...(apiUrl ? { apiUrl } : {})}
      {...(socketUrl ? { socketUrl } : {})}
    >
      <div className={inter.className}>
        <WebChat />
      </div>
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

/**
 * When `novu connect` runs from this monorepo against a local API, pin
 * `@novu/react` / `@novu/js` to the built workspace packages. npm `@next`
 * lags the monorepo build (no `listConversations`, weaker typing).
 * Published CLI has no sibling packages — keep the dist-tag.
 */
export function resolveLocalNovuSdkRoots(fromDir = __dirname): { react: string; js: string } | null {
  let dir = fromDir;

  for (let i = 0; i < 12; i += 1) {
    const reactDir = path.join(dir, 'packages', 'react');
    const jsDir = path.join(dir, 'packages', 'js');
    const reactPkg = path.join(reactDir, 'package.json');
    const jsPkg = path.join(jsDir, 'package.json');

    if (fs.existsSync(reactPkg) && fs.existsSync(jsPkg)) {
      try {
        const react = JSON.parse(fs.readFileSync(reactPkg, 'utf8')) as { name?: string };
        const js = JSON.parse(fs.readFileSync(jsPkg, 'utf8')) as { name?: string };
        if (
          react.name === '@novu/react' &&
          js.name === '@novu/js' &&
          fs.existsSync(path.join(reactDir, 'dist')) &&
          fs.existsSync(path.join(jsDir, 'dist'))
        ) {
          return { react: reactDir, js: jsDir };
        }
      } catch {
        return null;
      }
    }

    const parent = path.dirname(dir);
    if (parent === dir) {
      break;
    }

    dir = parent;
  }

  return null;
}

export function resolveWebChatNovuDependencies(apiUrl: string, region?: CloudRegionEnum): WebChatNovuDependencies {
  const tag = getNovuScaffoldSdkTag(apiUrl, region);

  return { react: tag, js: tag };
}

function resolveWebChatNovuDependenciesForProject(
  projectDir: string,
  apiUrl: string,
  region?: CloudRegionEnum
): WebChatNovuDependencies {
  const local = isNovuLocalApiUrl(apiUrl) ? resolveLocalNovuSdkRoots() : null;

  if (local) {
    return vendorLocalNovuSdks(projectDir, local);
  }

  return resolveWebChatNovuDependencies(apiUrl, region);
}

/**
 * Copy built workspace SDK packages into the scaffold so Next.js / Turbopack
 * resolve them inside the app. Symlinks to the monorepo (`file:/abs/path`)
 * break Turbopack; tarballs fail on `workspace:*` deps.
 */
export function vendorLocalNovuSdks(
  projectDir: string,
  local: { react: string; js: string }
): WebChatNovuDependencies {
  const reactVendor = path.join(projectDir, 'vendor', '@novu', 'react');
  const jsVendor = path.join(projectDir, 'vendor', '@novu', 'js');

  copyBuiltPackageVendor(local.js, jsVendor);
  copyBuiltPackageVendor(local.react, reactVendor, { '@novu/js': 'file:../js' });

  return {
    react: 'file:./vendor/@novu/react',
    js: 'file:./vendor/@novu/js',
  };
}

function copyBuiltPackageVendor(
  sourceDir: string,
  targetDir: string,
  dependencyOverrides: Record<string, string> = {}
): void {
  const sourcePkgPath = path.join(sourceDir, 'package.json');
  const sourceDist = path.join(sourceDir, 'dist');

  if (!fs.existsSync(sourcePkgPath) || !fs.existsSync(sourceDist)) {
    throw new Error(
      `Cannot vendor ${sourceDir}. Run "pnpm build" in packages/react and packages/js before scaffolding locally.`
    );
  }

  const sourcePkg = JSON.parse(fs.readFileSync(sourcePkgPath, 'utf8')) as {
    name?: string;
    version?: string;
    type?: string;
    main?: string;
    browser?: string;
    types?: string;
    exports?: unknown;
    dependencies?: Record<string, string>;
  };

  const dependencies: Record<string, string> = {};
  for (const [name, version] of Object.entries(sourcePkg.dependencies ?? {})) {
    if (!version.startsWith('workspace:')) {
      dependencies[name] = version;
    }
  }

  for (const [name, version] of Object.entries(dependencyOverrides)) {
    dependencies[name] = version;
  }

  fs.rmSync(targetDir, { recursive: true, force: true });
  fs.mkdirSync(targetDir, { recursive: true });
  fs.cpSync(sourceDist, path.join(targetDir, 'dist'), { recursive: true });
  fs.writeFileSync(
    path.join(targetDir, 'package.json'),
    `${JSON.stringify(
      {
        name: sourcePkg.name,
        version: sourcePkg.version,
        type: sourcePkg.type,
        main: sourcePkg.main,
        browser: sourcePkg.browser,
        types: sourcePkg.types,
        exports: sourcePkg.exports,
        dependencies,
      },
      null,
      2
    )}\n`,
    'utf8'
  );
}

function ensureWebChatNextConfig(projectDir: string): void {
  const existingPath = findNextConfigPath(projectDir);

  if (!existingPath) {
    fs.writeFileSync(path.join(projectDir, 'next.config.mjs'), WEB_CHAT_NEXT_CONFIG, 'utf8');
    return;
  }

  const source = fs.readFileSync(existingPath, 'utf8');
  const patched = patchNextConfigSource(source);
  if (patched) {
    fs.writeFileSync(existingPath, patched, 'utf8');
    return;
  }

  const configName = path.basename(existingPath);
  const missingPackages = WEB_CHAT_TRANSPILE_PACKAGES.filter(
    (pkg) => !source.includes(`'${pkg}'`) && !source.includes(`"${pkg}"`)
  );
  if (missingPackages.length > 0) {
    console.warn(
      yellow(
        `Web Chat could not patch transpilePackages in ${configName}. Add ${missingPackages.join(', ')} manually so @novu/react and assistant-ui compile.`
      )
    );
  }
}

const WEB_CHAT_UI_DEPENDENCIES = {
  '@assistant-ui/react': '^0.15.16',
  '@assistant-ui/react-markdown': '^0.14.12',
  '@base-ui/react': '^1.7.0',
  'class-variance-authority': '^0.7.1',
  clsx: '^2.1.1',
  'lucide-react': '^1.34.0',
  'react-markdown': '^10.1.0',
  'remark-gfm': '^4.0.1',
  shadcn: '^4.19.0',
  'tailwind-merge': '^3.6.0',
  'tw-animate-css': '^1.4.0',
  'tw-shimmer': '^0.4.12',
} as const;

const WEB_CHAT_DEV_DEPENDENCIES = {
  '@tailwindcss/postcss': '^4.3.3',
  tailwindcss: '^4.3.3',
} as const;

function webChatRuntimeDependencies(sdk: WebChatNovuDependencies): Record<string, string> {
  return {
    '@novu/react': sdk.react,
    ...(sdk.js ? { '@novu/js': sdk.js } : {}),
    ...WEB_CHAT_UI_DEPENDENCIES,
  };
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
        ...webChatRuntimeDependencies(sdk),
        next: '^16.2.11',
        react: '^18.3.1',
        'react-dom': '^18.3.1',
      },
      devDependencies: {
        ...WEB_CHAT_DEV_DEPENDENCIES,
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
      <body className={inter.className} suppressHydrationWarning>
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

const WEB_CHAT_NEXT_CONFIG = `import path from 'path';
import { fileURLToPath } from 'url';

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@novu/react', '@novu/js', '@assistant-ui/react'],
  turbopack: {
    root: projectRoot,
  },
};

export default nextConfig;
`;

const STANDALONE_POSTCSS_CONFIG = `export default {
  plugins: {
    '@tailwindcss/postcss': {},
  },
};
`;

const STANDALONE_GITIGNORE = `.next\nnode_modules\nvendor\n.env.local\n`;
