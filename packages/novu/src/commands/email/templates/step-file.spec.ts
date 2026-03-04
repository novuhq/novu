import { describe, expect, it } from 'vitest';
import { generateStepFile } from './step-file';

describe('generateStepFile', () => {
  const stepId = 'welcome-email';
  const workflowId = 'onboarding';
  const baseConfig = {
    template: 'emails/welcome.tsx',
  };

  it('should match snapshot', () => {
    const result = generateStepFile(stepId, workflowId, '../emails/welcome', baseConfig);
    expect(result).toMatchSnapshot();
  });

  it('should match snapshot with subject', () => {
    const config = {
      ...baseConfig,
      subject: 'Welcome to Acme!',
    };
    const result = generateStepFile(stepId, workflowId, '../emails/welcome', config);
    expect(result).toMatchSnapshot('with-subject');
  });

  it('should match snapshot with different import paths', () => {
    const result1 = generateStepFile(stepId, workflowId, './emails/welcome', baseConfig);
    expect(result1).toMatchSnapshot('relative-import');

    const result2 = generateStepFile(stepId, workflowId, '../../src/emails/welcome', baseConfig);
    expect(result2).toMatchSnapshot('nested-import');
  });
});
