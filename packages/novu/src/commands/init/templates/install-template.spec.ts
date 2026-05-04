import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { installTemplate } from './index';
import { TemplateTypeEnum } from './types';

vi.mock('../helpers/install', () => ({
  install: vi.fn().mockResolvedValue(undefined),
}));

describe('installTemplate – agent identifier renaming', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'novu-agent-'));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  const baseArgs = {
    appName: 'test-app',
    packageManager: 'npm' as const,
    isOnline: false,
    template: TemplateTypeEnum.APP_AGENT as const,
    mode: 'ts' as const,
    eslint: false,
    srcDir: false,
    importAlias: '@/*',
    secretKey: 'test-secret',
    apiUrl: 'https://api.novu.co',
    applicationId: '',
    userId: '',
  };

  it('keeps support-agent.tsx when no agentIdentifier is provided', async () => {
    await installTemplate({ ...baseArgs, root: tmpDir });

    const agentFile = path.join(tmpDir, 'app', 'novu', 'agents', 'support-agent.tsx');
    expect(await fs.stat(agentFile).then(() => true)).toBe(true);

    const content = await fs.readFile(agentFile, 'utf8');
    expect(content).toContain("agent('support-agent',");
    expect(content).toContain('export const supportAgent');
  });

  it('renames agent file to match agentIdentifier', async () => {
    await installTemplate({ ...baseArgs, root: tmpDir, agentIdentifier: 'first-agent' });

    const oldFile = path.join(tmpDir, 'app', 'novu', 'agents', 'support-agent.tsx');
    await expect(fs.stat(oldFile)).rejects.toThrow();

    const newFile = path.join(tmpDir, 'app', 'novu', 'agents', 'first-agent.tsx');
    const content = await fs.readFile(newFile, 'utf8');
    expect(content).toContain("agent('first-agent',");
    expect(content).toContain('export const firstAgent');
    expect(content).not.toContain('supportAgent');
  });

  it('updates agents/index.ts export to match agentIdentifier', async () => {
    await installTemplate({ ...baseArgs, root: tmpDir, agentIdentifier: 'first-agent' });

    const indexContent = await fs.readFile(path.join(tmpDir, 'app', 'novu', 'agents', 'index.ts'), 'utf8');
    expect(indexContent).toContain('firstAgent');
    expect(indexContent).toContain('./first-agent');
    expect(indexContent).not.toContain('supportAgent');
    expect(indexContent).not.toContain('./support-agent');
  });

  it('updates route.ts imports to match agentIdentifier', async () => {
    await installTemplate({ ...baseArgs, root: tmpDir, agentIdentifier: 'first-agent' });

    const routeContent = await fs.readFile(path.join(tmpDir, 'app', 'api', 'novu', 'route.ts'), 'utf8');
    expect(routeContent).toContain('firstAgent');
    expect(routeContent).not.toContain('supportAgent');
  });

  it('updates page.tsx reference to match agentIdentifier', async () => {
    await installTemplate({ ...baseArgs, root: tmpDir, agentIdentifier: 'first-agent' });

    const pageContent = await fs.readFile(path.join(tmpDir, 'app', 'page.tsx'), 'utf8');
    expect(pageContent).toContain('first-agent.tsx');
    expect(pageContent).not.toContain('support-agent.tsx');
  });

  it('updates README.md references to match agentIdentifier', async () => {
    await installTemplate({ ...baseArgs, root: tmpDir, agentIdentifier: 'first-agent' });

    const readmeContent = await fs.readFile(path.join(tmpDir, 'README.md'), 'utf8');
    expect(readmeContent).toContain('first-agent.tsx');
    expect(readmeContent).not.toContain('support-agent.tsx');
  });

  it('handles underscored identifiers correctly', async () => {
    await installTemplate({ ...baseArgs, root: tmpDir, agentIdentifier: 'my_cool_agent' });

    const newFile = path.join(tmpDir, 'app', 'novu', 'agents', 'my_cool_agent.tsx');
    const content = await fs.readFile(newFile, 'utf8');
    expect(content).toContain("agent('my_cool_agent',");
    expect(content).toContain('export const myCoolAgent');
  });

  it('rejects invalid agent identifiers', async () => {
    await expect(
      installTemplate({ ...baseArgs, root: tmpDir, agentIdentifier: 'INVALID' })
    ).rejects.toThrow('Invalid agent identifier');

    await expect(
      installTemplate({ ...baseArgs, root: tmpDir, agentIdentifier: 'has spaces' })
    ).rejects.toThrow('Invalid agent identifier');
  });
});
