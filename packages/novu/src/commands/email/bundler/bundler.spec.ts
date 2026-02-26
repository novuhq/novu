import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import type { DiscoveredStep } from '../types';
import { bundleRelease } from './bundler';

describe('bundleRelease', () => {
  let tempDir = '';

  afterEach(() => {
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('should bundle release when aliases are provided', async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'novu-bundler-alias-'));
    const sourceDir = path.join(tempDir, 'src');
    const stepDir = path.join(tempDir, 'novu');
    fs.mkdirSync(sourceDir, { recursive: true });
    fs.mkdirSync(stepDir, { recursive: true });

    fs.writeFileSync(path.join(sourceDir, 'utils.ts'), "export const body = 'Hello from alias';\n", 'utf8');

    const stepFilePath = path.join(stepDir, 'welcome.step.ts');
    fs.writeFileSync(
      stepFilePath,
      `
import { body } from '@emails/utils';

export const stepId = 'welcome-email';
export const workflowId = 'onboarding';
export const type = 'email';

export default async function () {
  return {
    subject: 'Welcome',
    body
  };
}
      `.trim(),
      'utf8'
    );

    const steps: DiscoveredStep[] = [
      {
        stepId: 'welcome-email',
        workflowId: 'onboarding',
        type: 'email',
        filePath: stepFilePath,
        relativePath: 'welcome.step.ts',
      },
    ];

    const bundle = await bundleRelease(steps, tempDir, {
      minify: false,
      aliases: {
        '@emails/*': './src/*',
      },
    });

    expect(bundle.size).toBeGreaterThan(0);
    expect(bundle.code).toContain('Hello from alias');
  });

  it('should show actionable unresolved import error when alias is missing', async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'novu-bundler-error-'));
    const stepDir = path.join(tempDir, 'novu');
    fs.mkdirSync(stepDir, { recursive: true });

    const stepFilePath = path.join(stepDir, 'missing-alias.step.ts');
    fs.writeFileSync(
      stepFilePath,
      `
import { body } from '@emails/utils';

export const stepId = 'missing-alias';
export const workflowId = 'onboarding';
export const type = 'email';

export default async function () {
  return {
    subject: 'Welcome',
    body
  };
}
      `.trim(),
      'utf8'
    );

    const steps: DiscoveredStep[] = [
      {
        stepId: 'missing-alias',
        workflowId: 'onboarding',
        type: 'email',
        filePath: stepFilePath,
        relativePath: 'missing-alias.step.ts',
      },
    ];

    try {
      await bundleRelease(steps, tempDir);
      throw new Error('Expected bundling to fail');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      expect(message).toContain('Unresolved imports');
      expect(message).toContain('aliases field');
    }
  });
});
