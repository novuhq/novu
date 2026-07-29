import { StepTypeEnum } from '@novu/shared';
import type { PinoLogger } from 'nestjs-pino';
import { describe, expect, it } from 'vitest';
import { dashboardSanitizeControlValues } from './sanitize-control-values';

const logger = { error: () => {} } as unknown as PinoLogger;

describe('dashboardSanitizeControlValues', () => {
  it.each([StepTypeEnum.CHAT, StepTypeEnum.TOOL, StepTypeEnum.PUSH])(
    'keeps providerOverrides stitched into %s control values',
    (stepType) => {
      const sanitized = dashboardSanitizeControlValues(
        logger,
        { body: 'hello', providerOverrides: { slack: { text: 'hi' } } },
        stepType
      );

      expect(sanitized).toEqual({ body: 'hello', providerOverrides: { slack: { text: 'hi' } } });
    }
  );

  it.each([StepTypeEnum.CHAT, StepTypeEnum.TOOL, StepTypeEnum.PUSH])(
    'omits providerOverrides from %s when absent',
    (stepType) => {
      const sanitized = dashboardSanitizeControlValues(logger, { body: 'hello' }, stepType);

      expect(sanitized).not.toHaveProperty('providerOverrides');
    }
  );
});
