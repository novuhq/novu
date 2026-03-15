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
    writeStepFile('onboarding/welcome-email.step.tsx', createStepFileContent({ stepId: 'welcome-email' }));

    const result = await discoverStepFiles(tempDir);

    expect(result.valid).toBe(true);
    expect(result.matchedFiles).toBe(1);
    expect(result.errors).toHaveLength(0);
    expect(result.steps).toHaveLength(1);
    expect(result.steps[0]).toMatchObject({
      stepId: 'welcome-email',
      workflowId: 'onboarding',
      type: 'email',
      relativePath: 'onboarding/welcome-email.step.tsx',
    });
  });

  it('discovers valid js and jsx step files', async () => {
    writeStepFile('workflow-js/plain-js.step.js', createStepFileContent({ stepId: 'plain-js', useJsx: false }));
    writeStepFile(
      'workflow-jsx/template-jsx.step.jsx',
      createStepFileContent({ stepId: 'template-jsx', useJsx: true })
    );

    const result = await discoverStepFiles(tempDir);

    expect(result.valid).toBe(true);
    expect(result.matchedFiles).toBe(2);
    expect(result.errors).toHaveLength(0);
    expect(result.steps.map((step) => step.stepId)).toEqual(['plain-js', 'template-jsx']);
  });

  it('returns valid steps and errors when files are mixed', async () => {
    writeStepFile('workflow-valid/valid.step.tsx', createStepFileContent({ stepId: 'valid-step', useJsx: true }));
    writeStepFile('workflow-valid/invalid.step.tsx', createStepFileContent({ includeStepId: false, useJsx: true }));

    const result = await discoverStepFiles(tempDir);

    expect(result.valid).toBe(false);
    expect(result.matchedFiles).toBe(2);
    expect(result.steps).toHaveLength(1);
    expect(result.steps[0].stepId).toBe('valid-step');

    const invalidError = result.errors.find((error) => error.filePath.endsWith('invalid.step.tsx'));
    expect(invalidError).toBeDefined();
    expect(invalidError?.errors.some((error) => error.includes('Missing step resolver'))).toBe(true);
  });

  it('detects missing workflow folder', async () => {
    writeStepFile('missing-required.step.tsx', createStepFileContent({}));

    const result = await discoverStepFiles(tempDir);

    expect(result.valid).toBe(false);
    expect(result.steps).toHaveLength(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].errors).toContain(
      'Step file must be inside a workflow folder (e.g., novu/{workflowId}/step-name.step.tsx)'
    );
  });

  it('detects missing stepId', async () => {
    writeStepFile('onboarding/missing-required.step.tsx', createStepFileContent({ includeStepId: false }));

    const result = await discoverStepFiles(tempDir);

    expect(result.valid).toBe(false);
    expect(result.steps).toHaveLength(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].errors.some((error) => error.includes('Missing step resolver'))).toBe(true);
  });

  it('accepts all supported channel step types', async () => {
    for (const type of ['email', 'sms', 'chat', 'push']) {
      writeStepFile(
        `onboarding/${type}-step.step.ts`,
        createStepFileContent({ stepId: `${type}-step`, type, useJsx: false })
      );
    }
    writeStepFile(
      'onboarding/inapp-step.step.ts',
      createStepFileContent({ stepId: 'inapp-step', type: 'inApp', useJsx: false })
    );

    const result = await discoverStepFiles(tempDir);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.steps).toHaveLength(5);
  });

  it('detects invalid step type', async () => {
    writeStepFile('onboarding/invalid-type.step.tsx', createStepFileContent({ type: 'custom' }));

    const result = await discoverStepFiles(tempDir);

    expect(result.valid).toBe(false);
    expect(result.steps).toHaveLength(0);
    expect(result.errors[0].errors.some((error) => error.includes('Invalid step type'))).toBe(true);
  });

  it('detects missing default export', async () => {
    writeStepFile('onboarding/missing-default.step.tsx', createStepFileContent({ includeDefaultExport: false }));

    const result = await discoverStepFiles(tempDir);

    expect(result.valid).toBe(false);
    expect(result.steps).toHaveLength(0);
    expect(result.errors[0].errors.some((error) => error.includes('default export'))).toBe(true);
  });

  it('allows duplicate step IDs across different workflows', async () => {
    writeStepFile('signup/confirmation.step.tsx', createStepFileContent({ stepId: 'confirmation' }));
    writeStepFile('booking/confirmation.step.tsx', createStepFileContent({ stepId: 'confirmation' }));

    const result = await discoverStepFiles(tempDir);

    expect(result.valid).toBe(true);
    expect(result.matchedFiles).toBe(2);
    expect(result.steps).toHaveLength(2);
    expect(result.errors).toHaveLength(0);
  });

  it('detects duplicate step IDs within same workflow', async () => {
    writeStepFile('onboarding/first.step.tsx', createStepFileContent({ stepId: 'duplicate-step' }));
    writeStepFile('onboarding/second.step.tsx', createStepFileContent({ stepId: 'duplicate-step' }));

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
    writeStepFile('wf-z/z-last.step.ts', createStepFileContent({ stepId: 'z-last', useJsx: false }));
    writeStepFile('wf-m/m-middle.step.ts', createStepFileContent({ stepId: 'm-middle', useJsx: false }));
    writeStepFile('wf-a/a-first.step.ts', createStepFileContent({ stepId: 'a-first', useJsx: false }));

    const result = await discoverStepFiles(tempDir);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.steps.map((step) => step.relativePath.replace(/\\/g, '/'))).toEqual([
      'wf-a/a-first.step.ts',
      'wf-m/m-middle.step.ts',
      'wf-z/z-last.step.ts',
    ]);
  });

  function writeStepFile(relativePath: string, content: string) {
    const absolutePath = path.join(tempDir, relativePath);
    fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
    fs.writeFileSync(absolutePath, content);
  }

  function createStepFileContent({
    stepId = 'welcome-email',
    type = 'email',
    includeStepId = true,
    includeDefaultExport = true,
    useJsx = true,
  }: {
    stepId?: string;
    type?: string;
    includeStepId?: boolean;
    includeDefaultExport?: boolean;
    useJsx?: boolean;
  } = {}): string {
    const lines: string[] = [];

    lines.push("import { step } from '@novu/framework/step-resolver';");
    lines.push("import { render } from '@react-email/components';");

    if (useJsx) {
      lines.push("import EmailTemplate from '../emails/welcome';");
    }

    lines.push('');

    if (includeDefaultExport) {
      if (includeStepId) {
        lines.push(`export default step.${type}('${stepId}', async (controls, { payload }) => ({`);
      } else {
        lines.push(`export default step.${type}(async (controls, { payload }) => ({`);
      }
      lines.push("  subject: payload?.subject || 'Welcome',");
      if (useJsx) {
        lines.push('  body: await render(<EmailTemplate {...payload} />),');
      } else {
        lines.push("  body: 'Hello',");
      }
      lines.push('}));');
    }

    lines.push('');

    return lines.join('\n');
  }
});
