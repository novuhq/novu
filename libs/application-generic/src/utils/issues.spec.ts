import { JsonSchemaTypeEnum } from '@novu/dal';
import { ContentIssueEnum, StepTypeEnum } from '@novu/shared';
import type { PinoLogger } from 'nestjs-pino';
import { describe, expect, it } from 'vitest';
import { chatControlSchema } from '../schemas/control';
import { processControlValuesBySchema } from './issues';
import { dashboardSanitizeControlValues } from './sanitize-control-values';

const logger = { error: () => {} } as unknown as PinoLogger;

const mailyBody = JSON.stringify({
  type: 'doc',
  content: [{ type: 'paragraph', content: [{ type: 'text', text: 'hi' }] }],
});

describe('processControlValuesBySchema', () => {
  it('maps additionalProperties failures to UNSUPPORTED_PROPERTY for any strict schema', () => {
    const issues = processControlValuesBySchema({
      controlSchema: {
        type: JsonSchemaTypeEnum.OBJECT,
        additionalProperties: false,
        properties: {
          body: { type: JsonSchemaTypeEnum.STRING },
        },
      },
      controlValues: {
        body: 'ok',
        unexpected: true,
      },
      stepType: StepTypeEnum.HTTP_REQUEST,
    });

    expect(issues.controls?.unexpected).toEqual([
      {
        message: '"unexpected" is not a supported property',
        issueType: ContentIssueEnum.UNSUPPORTED_PROPERTY,
        variableName: 'unexpected',
      },
    ]);
  });

  it('rejects empty-string chat editorType against the control schema', () => {
    const issues = processControlValuesBySchema({
      controlSchema: chatControlSchema,
      controlValues: { body: mailyBody, editorType: '' },
      stepType: StepTypeEnum.CHAT,
    });

    expect(issues.controls?.editorType?.[0]?.message).toBe('must be equal to one of the allowed values');
  });

  it('does not flag editorType after sanitizing a Maily chat body with an empty editorType', () => {
    const sanitized = dashboardSanitizeControlValues(logger, { body: mailyBody, editorType: '' }, StepTypeEnum.CHAT);

    const issues = processControlValuesBySchema({
      controlSchema: chatControlSchema,
      controlValues: sanitized || {},
      stepType: StepTypeEnum.CHAT,
    });

    expect(sanitized).toEqual({ body: mailyBody, editorType: 'block' });
    expect(issues.controls?.editorType).toBeUndefined();
  });

  it('does not flag editorType for an empty chat step after sanitize', () => {
    const sanitized = dashboardSanitizeControlValues(logger, { body: '', editorType: '' }, StepTypeEnum.CHAT);

    const issues = processControlValuesBySchema({
      controlSchema: chatControlSchema,
      controlValues: sanitized || {},
      stepType: StepTypeEnum.CHAT,
    });

    expect(sanitized).not.toHaveProperty('editorType');
    expect(issues.controls?.editorType).toBeUndefined();
    expect(issues.controls?.body).toBeDefined();
  });
});
