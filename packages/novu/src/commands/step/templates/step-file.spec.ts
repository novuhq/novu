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

  describe('with zod', () => {
    it('should match snapshot', () => {
      expect(generateReactEmailStepFile(stepId, '../emails/welcome', true)).toMatchSnapshot();
    });

    it('should match snapshot with different import paths', () => {
      expect(generateReactEmailStepFile(stepId, './emails/welcome', true)).toMatchSnapshot('relative-import');
      expect(generateReactEmailStepFile(stepId, '../../src/emails/welcome', true)).toMatchSnapshot('nested-import');
    });

    it('imports render from @react-email/components and calls it', () => {
      const result = generateReactEmailStepFile(stepId, '../emails/welcome', true);
      expect(result).toContain('step.email(');
      expect(result).toContain("'welcome-email'");
      expect(result).toContain("from '@react-email/components'");
      expect(result).toContain('await render(');
      expect(result).toContain("from 'zod'");
    });

    it('escapes single quotes in stepId and templatePath', () => {
      const result = generateReactEmailStepFile("it's-a-step", "../emails/it's-template", true);
      expect(result).toContain("it\\'s-a-step");
      expect(result).toContain("it\\'s-template");
    });
  });

  describe('without zod', () => {
    it('should match snapshot', () => {
      expect(generateReactEmailStepFile(stepId, '../emails/welcome', false)).toMatchSnapshot();
    });

    it('imports render from @react-email/components and calls it', () => {
      const result = generateReactEmailStepFile(stepId, '../emails/welcome', false);
      expect(result).toContain('step.email(');
      expect(result).toContain("from '@react-email/components'");
      expect(result).toContain('await render(');
      expect(result).not.toContain("from 'zod'");
      expect(result).toContain('as const');
    });
  });
});

describe('generateEmailStepFile', () => {
  describe('with zod', () => {
    it('should match snapshot', () => {
      expect(generateEmailStepFile('plain-email', true)).toMatchSnapshot();
    });

    it('does not use React Email', () => {
      const result = generateEmailStepFile('plain-email', true);
      expect(result).toContain('step.email(');
      expect(result).toContain("'plain-email'");
      expect(result).not.toContain('@react-email');
      expect(result).not.toContain('await render(');
      expect(result).toContain("from 'zod'");
    });
  });

  describe('without zod', () => {
    it('should match snapshot', () => {
      expect(generateEmailStepFile('plain-email', false)).toMatchSnapshot();
    });

    it('does not use React Email or zod', () => {
      const result = generateEmailStepFile('plain-email', false);
      expect(result).toContain('step.email(');
      expect(result).not.toContain('@react-email');
      expect(result).not.toContain("from 'zod'");
      expect(result).toContain('as const');
    });
  });
});

describe('generateSmsStepFile', () => {
  it('should match snapshot with zod', () => {
    expect(generateSmsStepFile('send-sms', true)).toMatchSnapshot();
  });

  it('should match snapshot without zod', () => {
    expect(generateSmsStepFile('send-sms', false)).toMatchSnapshot();
  });
});

describe('generatePushStepFile', () => {
  it('should match snapshot with zod', () => {
    expect(generatePushStepFile('send-push', true)).toMatchSnapshot();
  });

  it('should match snapshot without zod', () => {
    expect(generatePushStepFile('send-push', false)).toMatchSnapshot();
  });
});

describe('generateChatStepFile', () => {
  it('should match snapshot with zod', () => {
    expect(generateChatStepFile('send-chat', true)).toMatchSnapshot();
  });

  it('should match snapshot without zod', () => {
    expect(generateChatStepFile('send-chat', false)).toMatchSnapshot();
  });
});

describe('generateInAppStepFile', () => {
  it('should match snapshot with zod', () => {
    expect(generateInAppStepFile('in-app-notify', true)).toMatchSnapshot();
  });

  it('should match snapshot without zod', () => {
    expect(generateInAppStepFile('in-app-notify', false)).toMatchSnapshot();
  });
});

describe('generateStepFileForType', () => {
  it('throws for unknown type', () => {
    expect(() => generateStepFileForType('my-step', 'custom', false)).toThrow();
  });

  it('escapes single quotes in stepId', () => {
    const result = generateStepFileForType("it's", 'sms', false);
    expect(result).toContain("it\\'s");
  });

  it('uses zod when useZod is true', () => {
    const result = generateStepFileForType('my-step', 'sms', true);
    expect(result).toContain("from 'zod'");
  });

  it('uses json schema when useZod is false', () => {
    const result = generateStepFileForType('my-step', 'sms', false);
    expect(result).not.toContain("from 'zod'");
    expect(result).toContain('as const');
  });
});
