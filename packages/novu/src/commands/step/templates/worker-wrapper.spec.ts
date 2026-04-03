import { describe, expect, it } from 'vitest';
import type { DiscoveredStep } from '../types';
import { generateWorkerWrapper } from './worker-wrapper';

describe('generateWorkerWrapper', () => {
  const mockSteps: DiscoveredStep[] = [
    {
      stepId: 'welcome-email',
      workflowId: 'onboarding',
      type: 'email',
      filePath: '/root/novu/welcome-email.step.tsx',
      relativePath: 'welcome-email.step.tsx',
    },
    {
      stepId: 'verify-email',
      workflowId: 'onboarding',
      type: 'email',
      filePath: '/root/novu/verify-email.step.tsx',
      relativePath: 'verify-email.step.tsx',
    },
  ];

  it('should match snapshot', () => {
    const result = generateWorkerWrapper(mockSteps, '/root');
    expect(result).toMatchSnapshot();
  });

  it('should handle empty steps array', () => {
    const result = generateWorkerWrapper([], '/root');
    expect(result).toMatchSnapshot('empty-steps');
  });

  it('should handle single step', () => {
    const result = generateWorkerWrapper([mockSteps[0]], '/root');
    expect(result).toMatchSnapshot('single-step');
  });

  it('should import providerSchemas from @novu/framework/step-resolver', () => {
    const result = generateWorkerWrapper(mockSteps, '/root');

    expect(result).toContain("import { actionStepSchemas, channelStepSchemas, providerSchemas } from '@novu/framework/step-resolver'");
  });

  it('should use inline workflowId strings and stepHandler.stepId for map keys', () => {
    const result = generateWorkerWrapper(mockSteps, '/root');

    expect(result).toContain('"onboarding"');
    expect(result).toContain('stepHandler0.stepId');
    expect(result).toContain('stepHandler1.stepId');
    expect(result).not.toContain('workflowId as');
  });

  it('should call step.resolve with validatedControls as first arg and ctx as second', () => {
    const result = generateWorkerWrapper(mockSteps, '/root');

    expect(result).toContain('step.resolve(validatedControls, {');
  });

  it('should generate INVALID_CONTROLS response when schema validation fails', () => {
    const result = generateWorkerWrapper(mockSteps, '/root');

    expect(result).toContain("error: 'INVALID_CONTROLS'");
  });

  it('should generate map-based dispatch and invalid JSON handling', () => {
    const result = generateWorkerWrapper(mockSteps, '/root');

    expect(result).toContain('const stepHandlers = new Map([');
    expect(result).toContain('function jsonResponse(body, status, extraHeaders = {})');
    expect(result).toContain("Allow: 'POST'");
    expect(result).toContain("error: 'Invalid JSON body'");
    expect(result).toContain("error: 'STEP_HANDLER_ERROR'");
  });

  it('should evaluate step.skip before calling step.resolve but not in preview mode', () => {
    const result = generateWorkerWrapper(mockSteps, '/root');

    expect(result).toContain("body.action === 'preview'");
    expect(result).toContain('if (!isPreview && step.skip)');
    expect(result).toContain('const shouldSkip = await step.skip(validatedControls,');
    expect(result).toContain('if (shouldSkip)');
  });

  it('should return skip response with ExecuteOutput shape when skipped', () => {
    const result = generateWorkerWrapper(mockSteps, '/root');

    expect(result).toContain('options: { skip: true }');
  });

  it('should execute provider overrides and collect results', () => {
    const result = generateWorkerWrapper(mockSteps, '/root');

    expect(result).toContain('if (step.providers)');
    expect(result).toContain('for (const [providerKey, providerResolve] of Object.entries(step.providers))');
    expect(result).toContain('await providerResolve(');
    expect(result).toContain("error: 'INVALID_PROVIDER_OUTPUT'");
  });

  it('should preserve _passthrough metadata from provider result after schema validation', () => {
    const result = generateWorkerWrapper(mockSteps, '/root');

    expect(result).toContain('providerResult._passthrough !== undefined');
    expect(result).toContain('_passthrough: providerResult._passthrough');
  });

  it('should return ExecuteOutput-shaped response with outputs, providers, options, and metadata', () => {
    const result = generateWorkerWrapper(mockSteps, '/root');

    expect(result).toContain('outputs: validatedResult');
    expect(result).toContain('providers,');
    expect(result).toContain('options: { skip: false }');
    expect(result).toContain("status: 'success'");
    expect(result).toContain('error: false');
    expect(result).toContain('duration: Date.now() - startTime');
    expect(result).toContain('stepType: step.type');
    expect(result).toContain('disableOutputSanitization: step.disableOutputSanitization === true');
  });

  it('should not return flat legacy response format', () => {
    const result = generateWorkerWrapper(mockSteps, '/root');

    expect(result).not.toContain('stepId: step.stepId, workflowId: workflowId, ...validatedResult');
  });

  it('should pre-compile provider validators during startup', () => {
    const result = generateWorkerWrapper(mockSteps, '/root');

    expect(result).toContain('handler.providers && providerSchemas[handler.type]');
  });

  it('should track startTime for duration calculation', () => {
    const result = generateWorkerWrapper(mockSteps, '/root');

    expect(result).toContain('const startTime = Date.now()');
  });
});
