import { describe, expect, it } from 'vitest';
import {
  generateChatStepFile,
  generateEmailStepFile,
  generateInAppStepFile,
  generatePushStepFile,
  generateReactEmailStepFile,
  generateSmsStepFile,
  generateStepFileForType,
} from './step-file';

describe('generateReactEmailStepFile', () => {
  const stepId = 'welcome-email';

  it('should match snapshot', () => {
    expect(generateReactEmailStepFile(stepId, '../emails/welcome')).toMatchSnapshot();
  });

  it('should match snapshot with different import paths', () => {
    expect(generateReactEmailStepFile(stepId, './emails/welcome')).toMatchSnapshot('relative-import');
    expect(generateReactEmailStepFile(stepId, '../../src/emails/welcome')).toMatchSnapshot('nested-import');
  });

  it('imports render from @react-email/components and calls it', () => {
    const result = generateReactEmailStepFile(stepId, '../emails/welcome');
    expect(result).toContain("step.email('welcome-email'");
    expect(result).toContain("from '@react-email/components'");
    expect(result).toContain('await render(');
  });

  it('escapes single quotes in stepId and templatePath', () => {
    const result = generateReactEmailStepFile("it's-a-step", "../emails/it's-template");
    expect(result).toContain("it\\'s-a-step");
    expect(result).toContain("it\\'s-template");
  });
});

describe('generateEmailStepFile', () => {
  it('should match snapshot', () => {
    expect(generateEmailStepFile('plain-email')).toMatchSnapshot();
  });

  it('does not use React Email', () => {
    const result = generateEmailStepFile('plain-email');
    expect(result).toContain("step.email('plain-email'");
    expect(result).not.toContain('@react-email');
    expect(result).not.toContain('await render(');
  });
});

describe('generateSmsStepFile', () => {
  it('should match snapshot', () => {
    expect(generateSmsStepFile('send-sms')).toMatchSnapshot();
  });
});

describe('generatePushStepFile', () => {
  it('should match snapshot', () => {
    expect(generatePushStepFile('send-push')).toMatchSnapshot();
  });
});

describe('generateChatStepFile', () => {
  it('should match snapshot', () => {
    expect(generateChatStepFile('send-chat')).toMatchSnapshot();
  });
});

describe('generateInAppStepFile', () => {
  it('should match snapshot', () => {
    expect(generateInAppStepFile('in-app-notify')).toMatchSnapshot();
  });
});

describe('generateStepFileForType', () => {
  it('throws for unknown type', () => {
    expect(() => generateStepFileForType('my-step', 'custom')).toThrow();
  });

  it('escapes single quotes in stepId', () => {
    const result = generateStepFileForType("it's", 'sms');
    expect(result).toContain("it\\'s");
  });
});
