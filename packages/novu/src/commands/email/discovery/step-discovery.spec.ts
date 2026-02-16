import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { discoverStepFiles } from './step-discovery';

describe('step-discovery', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'novu-test-'));
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('discovers and validates a correct tsx step file', async () => {
    writeStepFile(
      'welcome-email.step.tsx',
      createStepFileContent({ stepId: 'welcome-email', workflowId: 'onboarding' })
    );

    const result = await discoverStepFiles(tempDir);

    expect(result.valid).toBe(true);
    expect(result.matchedFiles).toBe(1);
    expect(result.errors).toHaveLength(0);
    expect(result.steps).toHaveLength(1);
    expect(result.steps[0]).toMatchObject({
      stepId: 'welcome-email',
      workflowId: 'onboarding',
      type: 'email',
      relativePath: 'welcome-email.step.tsx',
    });
  });

  it('discovers valid js and jsx step files', async () => {
    writeStepFile(
      'plain-js.step.js',
      createStepFileContent({ stepId: 'plain-js', workflowId: 'workflow-js', useJsx: false })
    );
    writeStepFile(
      'template-jsx.step.jsx',
      createStepFileContent({ stepId: 'template-jsx', workflowId: 'workflow-jsx', useJsx: true })
    );

    const result = await discoverStepFiles(tempDir);

    expect(result.valid).toBe(true);
    expect(result.matchedFiles).toBe(2);
    expect(result.errors).toHaveLength(0);
    expect(result.steps.map((step) => step.stepId)).toEqual(['plain-js', 'template-jsx']);
  });

  it('returns valid steps and errors when files are mixed', async () => {
    writeStepFile(
      'valid.step.tsx',
      createStepFileContent({ stepId: 'valid-step', workflowId: 'workflow-valid', useJsx: true })
    );
    writeStepFile(
      'invalid.step.tsx',
      createStepFileContent({ includeStepId: false, workflowId: 'workflow-valid', useJsx: true })
    );

    const result = await discoverStepFiles(tempDir);

    expect(result.valid).toBe(false);
    expect(result.matchedFiles).toBe(2);
    expect(result.steps).toHaveLength(1);
    expect(result.steps[0].stepId).toBe('valid-step');

    const invalidError = result.errors.find((error) => error.filePath.endsWith('invalid.step.tsx'));
    expect(invalidError).toBeDefined();
    expect(invalidError?.errors.some((error) => error.includes('stepId'))).toBe(true);
  });

  it.each([
    ['stepId', { includeStepId: false }, "Missing required export: 'stepId' (must be a string literal)"],
    ['workflowId', { includeWorkflowId: false }, "Missing required export: 'workflowId' (must be a string literal)"],
    ['type', { includeType: false }, "Missing required export: 'type' (must be a string literal)"],
  ])('detects missing %s export', async (_name, options, expectedError) => {
    writeStepFile('missing-required.step.tsx', createStepFileContent(options));

    const result = await discoverStepFiles(tempDir);

    expect(result.valid).toBe(false);
    expect(result.steps).toHaveLength(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].errors).toContain(expectedError);
  });

  it('detects invalid type export', async () => {
    writeStepFile('invalid-type.step.tsx', createStepFileContent({ type: 'sms' }));

    const result = await discoverStepFiles(tempDir);

    expect(result.valid).toBe(false);
    expect(result.steps).toHaveLength(0);
    expect(result.errors[0].errors.some((error) => error.includes("must be 'email'"))).toBe(true);
  });

  it('detects missing default export', async () => {
    writeStepFile('missing-default.step.tsx', createStepFileContent({ includeDefaultExport: false }));

    const result = await discoverStepFiles(tempDir);

    expect(result.valid).toBe(false);
    expect(result.steps).toHaveLength(0);
    expect(result.errors[0].errors.some((error) => error.includes('default function'))).toBe(true);
  });

  it('detects missing react-email import', async () => {
    writeStepFile('missing-import.step.tsx', createStepFileContent({ includeReactEmailImport: false }));

    const result = await discoverStepFiles(tempDir);

    expect(result.valid).toBe(false);
    expect(result.steps).toHaveLength(0);
    expect(result.errors[0].errors.some((error) => error.includes('@react-email'))).toBe(true);
  });

  it('allows duplicate step IDs across different workflows', async () => {
    writeStepFile('first.step.tsx', createStepFileContent({ stepId: 'confirmation', workflowId: 'signup' }));
    writeStepFile('second.step.tsx', createStepFileContent({ stepId: 'confirmation', workflowId: 'booking' }));

    const result = await discoverStepFiles(tempDir);

    expect(result.valid).toBe(true);
    expect(result.matchedFiles).toBe(2);
    expect(result.steps).toHaveLength(2);
    expect(result.errors).toHaveLength(0);
  });

  it('detects duplicate step IDs within same workflow', async () => {
    writeStepFile('first.step.tsx', createStepFileContent({ stepId: 'duplicate-step', workflowId: 'onboarding' }));
    writeStepFile('second.step.tsx', createStepFileContent({ stepId: 'duplicate-step', workflowId: 'onboarding' }));

    const result = await discoverStepFiles(tempDir);

    expect(result.valid).toBe(false);
    expect(result.matchedFiles).toBe(2);
    expect(result.steps).toHaveLength(0);
    expect(result.errors).toHaveLength(2);
    expect(
      result.errors.every((error) =>
        error.errors.some((message) => message.includes("Duplicate stepId: 'duplicate-step' for workflow 'onboarding'"))
      )
    ).toBe(true);
  });

  it('returns empty result when no step files are found', async () => {
    const result = await discoverStepFiles(tempDir);

    expect(result.valid).toBe(true);
    expect(result.matchedFiles).toBe(0);
    expect(result.steps).toHaveLength(0);
    expect(result.errors).toHaveLength(0);
  });

  it('returns discovered steps in deterministic path order', async () => {
    writeStepFile('z-last.step.ts', createStepFileContent({ stepId: 'z-last', workflowId: 'wf-z', useJsx: false }));
    writeStepFile(
      'nested/m-middle.step.ts',
      createStepFileContent({ stepId: 'm-middle', workflowId: 'wf-m', useJsx: false })
    );
    writeStepFile('a-first.step.ts', createStepFileContent({ stepId: 'a-first', workflowId: 'wf-a', useJsx: false }));

    const result = await discoverStepFiles(tempDir);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.steps.map((step) => step.relativePath.replace(/\\/g, '/'))).toEqual([
      'a-first.step.ts',
      'nested/m-middle.step.ts',
      'z-last.step.ts',
    ]);
  });

  function writeStepFile(relativePath: string, content: string) {
    const absolutePath = path.join(tempDir, relativePath);
    fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
    fs.writeFileSync(absolutePath, content);
  }

  function createStepFileContent({
    stepId = 'welcome-email',
    workflowId = 'onboarding',
    type = 'email',
    includeStepId = true,
    includeWorkflowId = true,
    includeType = true,
    includeDefaultExport = true,
    includeReactEmailImport = true,
    useJsx = true,
  }: {
    stepId?: string;
    workflowId?: string;
    type?: string;
    includeStepId?: boolean;
    includeWorkflowId?: boolean;
    includeType?: boolean;
    includeDefaultExport?: boolean;
    includeReactEmailImport?: boolean;
    useJsx?: boolean;
  } = {}): string {
    const lines: string[] = [];

    if (includeReactEmailImport) {
      lines.push("import { render } from '@react-email/components';");
    }

    if (useJsx) {
      lines.push("import EmailTemplate from '../emails/welcome';");
    }

    lines.push('');

    if (includeStepId) {
      lines.push(`export const stepId = '${stepId}';`);
    }

    if (includeWorkflowId) {
      lines.push(`export const workflowId = '${workflowId}';`);
    }

    if (includeType) {
      lines.push(`export const type = '${type}';`);
    }

    lines.push('');

    if (includeDefaultExport) {
      lines.push('export default async function({ payload }) {');
      lines.push('  return {');
      lines.push("    subject: payload?.subject || 'Welcome',");

      if (useJsx) {
        lines.push('    body: await render(<EmailTemplate {...payload} />),');
      } else {
        lines.push("    body: await render('Hello'),");
      }

      lines.push('  };');
      lines.push('}');
    }

    lines.push('');

    return lines.join('\n');
  }
});
