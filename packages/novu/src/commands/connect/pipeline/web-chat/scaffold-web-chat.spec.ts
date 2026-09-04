import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { NOVU_STAGING_API_URL } from '@novu/shared';
import { describe, expect, it, vi } from 'vitest';
import { CloudRegionEnum } from '../../../dev/enums';

vi.mock('../../../init/helpers/is-online', () => ({
  getOnline: vi.fn(async () => false),
}));

import {
  assertSafeScaffoldDirectoryName,
  resolveLocalNovuSdkRoots,
  resolveWebChatNovuDependencies,
  scaffoldWebChatProject,
} from './scaffold-web-chat';

describe('assertSafeScaffoldDirectoryName', () => {
  it('accepts a simple directory name', () => {
    expect(() => assertSafeScaffoldDirectoryName('support-agent-web-chat')).not.toThrow();
  });

  it('rejects path traversal segments', () => {
    expect(() => assertSafeScaffoldDirectoryName('../../../../tmp/malicious-web-chat')).toThrow(
      /Invalid scaffold directory name/
    );
  });

  it('rejects absolute paths', () => {
    expect(() => assertSafeScaffoldDirectoryName('/tmp/malicious-web-chat')).toThrow(/Invalid scaffold directory name/);
  });
});

describe('scaffoldWebChatProject', () => {
  it('rejects unsafe agent identifiers before writing outside the parent directory', async () => {
    const parentDir = fs.mkdtempSync(path.join(os.tmpdir(), 'novu-web-chat-scaffold-'));

    await expect(
      scaffoldWebChatProject({
        parentDir,
        agentIdentifier: '../../../../tmp/malicious',
        applicationIdentifier: 'app-id',
        subscriberId: 'subscriber-id',
        apiUrl: 'http://localhost:3000',
      })
    ).rejects.toThrow(/Invalid scaffold directory name/);
  });

  it('does not hardcode localhost when merging Web Chat into an existing project', async () => {
    const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'novu-web-chat-merge-'));
    fs.writeFileSync(
      path.join(projectDir, 'package.json'),
      JSON.stringify(
        {
          name: 'agent-app',
          dependencies: {
            '@novu/react': 'latest',
            '@novu/js': 'latest',
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
          },
          devDependencies: {
            '@tailwindcss/postcss': '^4.3.3',
            tailwindcss: '^4.3.3',
          },
        },
        null,
        2
      )
    );

    fs.mkdirSync(path.join(projectDir, 'app'), { recursive: true });
    fs.writeFileSync(
      path.join(projectDir, 'app', 'globals.css'),
      `@tailwind base;\n@tailwind components;\n@tailwind utilities;\n`,
      'utf8'
    );

    await scaffoldWebChatProject({
      parentDir: projectDir,
      agentIdentifier: 'support-agent',
      applicationIdentifier: 'app-id',
      subscriberId: 'subscriber-id',
      apiUrl: 'https://api.novu.co',
      mergeIntoProjectDir: projectDir,
      mergeAtRoot: true,
    });

    const page = fs.readFileSync(path.join(projectDir, 'app', 'page.tsx'), 'utf8');
    expect(page).not.toContain('localhost:3000');
    expect(page).toContain('...(apiUrl ? { apiUrl } : {})');
    expect(page).toContain('...(socketUrl ? { socketUrl } : {})');

    const runtime = fs.readFileSync(
      path.join(projectDir, 'components', 'web-chat', 'assistant-ui', 'web-chat-runtime.tsx'),
      'utf8'
    );
    expect(runtime).toContain('@assistant-ui/react');

    const webChat = fs.readFileSync(path.join(projectDir, 'components', 'web-chat', 'web-chat.tsx'), 'utf8');
    expect(webChat).toContain('className="shell"');
    expect(webChat).toContain('className="workbench"');
    expect(webChat).toContain('showAgentActivity');
    expect(page).not.toContain('novu-web-chat');

    const mergedGlobals = fs.readFileSync(path.join(projectDir, 'app', 'globals.css'), 'utf8');
    expect(mergedGlobals).toContain("components/web-chat/globals.css");
    expect(mergedGlobals).toContain('@tailwind base');

    const packageJson = JSON.parse(fs.readFileSync(path.join(projectDir, 'package.json'), 'utf8')) as {
      dependencies: Record<string, string>;
    };
    expect(packageJson.dependencies['@assistant-ui/react']).toBe('^0.15.16');
  });

  it('patches an existing next.config.ts instead of creating next.config.mjs', async () => {
    const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'novu-web-chat-next-config-'));
    fs.writeFileSync(
      path.join(projectDir, 'package.json'),
      JSON.stringify(
        {
          name: 'agent-app',
          dependencies: {
            '@novu/react': 'latest',
            '@novu/js': 'latest',
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
            next: '^16.0.0',
          },
          devDependencies: {
            '@tailwindcss/postcss': '^4.3.3',
            tailwindcss: '^4.3.3',
          },
        },
        null,
        2
      )
    );
    fs.mkdirSync(path.join(projectDir, 'app'), { recursive: true });
    fs.writeFileSync(
      path.join(projectDir, 'next.config.ts'),
      `import type { NextConfig } from 'next';\n\nconst nextConfig: NextConfig = {\n  reactStrictMode: true,\n};\n\nexport default nextConfig;\n`,
      'utf8'
    );

    await scaffoldWebChatProject({
      parentDir: projectDir,
      agentIdentifier: 'support-agent',
      applicationIdentifier: 'app-id',
      subscriberId: 'subscriber-id',
      apiUrl: 'https://api.novu.co',
      mergeIntoProjectDir: projectDir,
    });

    expect(fs.existsSync(path.join(projectDir, 'next.config.mjs'))).toBe(false);
    const nextConfig = fs.readFileSync(path.join(projectDir, 'next.config.ts'), 'utf8');
    expect(nextConfig).toContain('transpilePackages');
    expect(nextConfig).toContain('@assistant-ui/react');
    expect(nextConfig).toContain('reactStrictMode: true');
  });

  it('upgrades Tailwind 3 postcss config when pinning Tailwind 4 dependencies', async () => {
    const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'novu-web-chat-postcss-'));
    fs.writeFileSync(
      path.join(projectDir, 'package.json'),
      JSON.stringify(
        {
          name: 'agent-app',
          dependencies: {
            '@novu/react': 'latest',
            '@novu/js': 'latest',
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
          },
          devDependencies: { tailwindcss: '^3.4.0', autoprefixer: '^10.4.0', postcss: '^8.4.0' },
        },
        null,
        2
      )
    );
    fs.mkdirSync(path.join(projectDir, 'app'), { recursive: true });
    fs.writeFileSync(
      path.join(projectDir, 'postcss.config.js'),
      `module.exports = {\n  plugins: {\n    tailwindcss: {},\n    autoprefixer: {},\n  },\n};\n`,
      'utf8'
    );

    await scaffoldWebChatProject({
      parentDir: projectDir,
      agentIdentifier: 'support-agent',
      applicationIdentifier: 'app-id',
      subscriberId: 'subscriber-id',
      apiUrl: 'https://api.novu.co',
      mergeIntoProjectDir: projectDir,
    });

    const postcss = fs.readFileSync(path.join(projectDir, 'postcss.config.js'), 'utf8');
    expect(postcss).toContain('@tailwindcss/postcss');
    expect(postcss).not.toContain('tailwindcss: {}');

    const packageJson = JSON.parse(fs.readFileSync(path.join(projectDir, 'package.json'), 'utf8')) as {
      devDependencies: Record<string, string>;
    };
    expect(packageJson.devDependencies.tailwindcss).toBe('^4.3.3');
  });
});

describe('resolveWebChatNovuDependencies', () => {
  it('pins @novu/react and @novu/js to next on staging API', () => {
    expect(resolveWebChatNovuDependencies(NOVU_STAGING_API_URL)).toEqual({
      react: 'next',
      js: 'next',
    });
  });

  it('pins @novu/react and @novu/js to vendored workspace packages on local API', () => {
    const local = resolveLocalNovuSdkRoots();
    expect(local).not.toBeNull();
    expect(resolveWebChatNovuDependencies('http://localhost:3000')).toEqual({
      react: 'file:./vendor/@novu/react',
      js: 'file:./vendor/@novu/js',
    });
  });

  it('uses latest from npm when scaffolding against production API', () => {
    expect(resolveWebChatNovuDependencies('https://api.novu.co')).toEqual({
      react: 'latest',
      js: 'latest',
    });
  });

  it('pins next packages when --staging region is set even with a custom api url', () => {
    expect(resolveWebChatNovuDependencies('https://api.novu.co', CloudRegionEnum.STAGING)).toEqual({
      react: 'next',
      js: 'next',
    });
  });
});
