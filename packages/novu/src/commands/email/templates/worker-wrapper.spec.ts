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

  it('should keep workflow IDs in step entries', () => {
    const result = generateWorkerWrapper(mockSteps, '/root');

    expect(result).toContain('workflowId: workflowId0');
    expect(result).toContain('workflowId: workflowId1');
  });

  it('should generate map-based dispatch and invalid JSON handling', () => {
    const result = generateWorkerWrapper(mockSteps, '/root');

    expect(result).toContain('const stepHandlers = new Map([');
    expect(result).toContain('function jsonResponse(body, status, extraHeaders = {})');
    expect(result).toContain("Allow: 'POST'");
    expect(result).toContain("error: 'Invalid JSON body'");
    expect(result).toContain("message: 'Internal server error'");
  });
});
