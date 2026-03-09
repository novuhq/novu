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
});
