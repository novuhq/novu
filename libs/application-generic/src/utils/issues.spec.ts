import { ContentIssueEnum, StepTypeEnum, ToolProviderIdEnum } from '@novu/shared';
import { describe, expect, it } from 'vitest';
import { JSONSchemaDto } from '../dtos/json-schema.dto';
import { toolControlSchema } from '../schemas/control/tool-control.schema';
import { processControlValuesBySchema } from './issues';

describe('processControlValuesBySchema', () => {
  describe('tool provider overrides (keys-only strictness)', () => {
    it('flags unknown override keys with an UNSUPPORTED_PROPERTY issue at the full path', () => {
      const issues = processControlValuesBySchema({
        controlSchema: toolControlSchema as unknown as JSONSchemaDto,
        controlValues: {
          body: 'MemoryDB alert',
          providerOverrides: {
            [ToolProviderIdEnum.Opsgenie]: {
              message: 'db is down',
              foo: 'bar',
            },
          },
        },
        stepType: StepTypeEnum.TOOL,
      });

      const path = `providerOverrides.${ToolProviderIdEnum.Opsgenie}.foo`;
      expect(issues.controls?.[path]).toEqual([
        {
          message: '"foo" is not a supported property',
          issueType: ContentIssueEnum.UNSUPPORTED_PROPERTY,
          variableName: path,
        },
      ]);
    });

    it('accepts known override keys with Liquid values without issues', () => {
      const issues = processControlValuesBySchema({
        controlSchema: toolControlSchema as unknown as JSONSchemaDto,
        controlValues: {
          body: 'MemoryDB alert',
          providerOverrides: {
            [ToolProviderIdEnum.Opsgenie]: {
              priority: '{{payload.priority}}',
              tags: '{{payload.tags}}',
            },
            [ToolProviderIdEnum.PagerDuty]: {
              severity: '{{payload.severity}}',
              summary: '{{payload.title}}',
            },
          },
        },
        stepType: StepTypeEnum.TOOL,
      });

      expect(issues.controls).toBeUndefined();
    });

    it('flags unsupported override keys that previously slipped past a permissive stored schema', () => {
      const issues = processControlValuesBySchema({
        controlSchema: toolControlSchema as unknown as JSONSchemaDto,
        controlValues: {
          body: 'default text',
          providerOverrides: {
            [ToolProviderIdEnum.Opsgenie]: {
              adaa: 'asd',
            },
            [ToolProviderIdEnum.PagerDuty]: {
              summary: '{{subscriber.avatar}}',
            },
          },
        },
        stepType: StepTypeEnum.TOOL,
      });

      const path = `providerOverrides.${ToolProviderIdEnum.Opsgenie}.adaa`;
      expect(issues.controls?.[path]).toEqual([
        {
          message: '"adaa" is not a supported property',
          issueType: ContentIssueEnum.UNSUPPORTED_PROPERTY,
          variableName: path,
        },
      ]);
    });
  });

  it('maps additionalProperties failures to UNSUPPORTED_PROPERTY for any strict schema', () => {
    const issues = processControlValuesBySchema({
      controlSchema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          body: { type: 'string' },
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
