import { JsonSchemaTypeEnum } from '@novu/dal';
import { ContentIssueEnum, StepTypeEnum } from '@novu/shared';
import { describe, expect, it } from 'vitest';
import { processControlValuesBySchema } from './issues';

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
});
