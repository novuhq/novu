import { StepTypeEnum } from '@novu/shared';
import type { PinoLogger } from 'nestjs-pino';
import { describe, expect, it } from 'vitest';
import { dashboardSanitizeControlValues } from './sanitize-control-values';

const logger = { error: () => {} } as unknown as PinoLogger;

describe('dashboardSanitizeControlValues', () => {
  it.each([StepTypeEnum.CHAT, StepTypeEnum.TOOL])(
    'keeps providerOverrides stitched into %s control values',
    (stepType) => {
      const sanitized = dashboardSanitizeControlValues(
        logger,
        { body: 'hello', providerOverrides: { slack: { text: 'hi' } } },
        stepType
      );

      expect(sanitized).toMatchObject({ body: 'hello', providerOverrides: { slack: { text: 'hi' } } });
    }
  );

  it.each([StepTypeEnum.CHAT, StepTypeEnum.TOOL])('omits providerOverrides from %s when absent', (stepType) => {
    const sanitized = dashboardSanitizeControlValues(logger, { body: 'hello' }, stepType);

    expect(sanitized).not.toHaveProperty('providerOverrides');
  });

  it('keeps chat editorType when present', () => {
    const sanitized = dashboardSanitizeControlValues(logger, { body: 'hello', editorType: 'text' }, StepTypeEnum.CHAT);

    expect(sanitized).toEqual({ body: 'hello', editorType: 'text' });
  });

  it('infers chat editorType as text from a plain body when editorType is absent', () => {
    const sanitized = dashboardSanitizeControlValues(logger, { body: 'hello' }, StepTypeEnum.CHAT);

    expect(sanitized).toEqual({ body: 'hello', editorType: 'text' });
  });

  it('infers chat editorType as block from Maily JSON when editorType is unset or invalid', () => {
    const mailyBody = JSON.stringify({
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'hi' }] }],
    });

    expect(dashboardSanitizeControlValues(logger, { body: mailyBody, editorType: '' }, StepTypeEnum.CHAT)).toEqual({
      body: mailyBody,
      editorType: 'block',
    });
    expect(dashboardSanitizeControlValues(logger, { body: mailyBody }, StepTypeEnum.CHAT)).toEqual({
      body: mailyBody,
      editorType: 'block',
    });
  });

  it('omits chat editorType when body and editorType are both empty', () => {
    const sanitized = dashboardSanitizeControlValues(logger, { body: '', editorType: '' }, StepTypeEnum.CHAT);

    expect(sanitized).not.toHaveProperty('editorType');
  });

  it('omits an empty throttle dynamicKey for a fixed throttle', () => {
    const sanitized = dashboardSanitizeControlValues(
      logger,
      { type: 'fixed', amount: 1, unit: 'hours', dynamicKey: '', threshold: 1, throttleKey: '{{payload.alertKey}}' },
      StepTypeEnum.THROTTLE
    );

    expect(sanitized).toEqual({
      type: 'fixed',
      amount: 1,
      unit: 'hours',
      threshold: 1,
      throttleKey: '{{payload.alertKey}}',
    });
  });

  it('keeps an empty throttle dynamicKey for a dynamic throttle so the issue still surfaces', () => {
    const sanitized = dashboardSanitizeControlValues(
      logger,
      { type: 'dynamic', dynamicKey: '', threshold: 1 },
      StepTypeEnum.THROTTLE
    );

    expect(sanitized).toEqual({ type: 'dynamic', dynamicKey: '', threshold: 1 });
  });

  it('keeps a populated throttle dynamicKey regardless of type', () => {
    const sanitized = dashboardSanitizeControlValues(
      logger,
      { type: 'fixed', amount: 1, unit: 'hours', dynamicKey: 'payload.timestamp' },
      StepTypeEnum.THROTTLE
    );

    expect(sanitized).toEqual({ type: 'fixed', amount: 1, unit: 'hours', dynamicKey: 'payload.timestamp' });
  });
});
