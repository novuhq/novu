import { JsonSchemaTypeEnum } from '@novu/dal';
import { ContentIssueEnum, StepTypeEnum } from '@novu/shared';
import type { PinoLogger } from 'nestjs-pino';
import { describe, expect, it } from 'vitest';
import { JSONSchemaDto } from '../dtos/json-schema.dto';
import { chatControlSchema } from '../schemas/control';
import { ControlIssues, processControlValuesByLiquid, processControlValuesBySchema } from './issues';
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

  it('validates schemas using JSON Schema draft 2020-12', () => {
    const issues = processControlValuesBySchema({
      controlSchema: {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: JsonSchemaTypeEnum.OBJECT,
        properties: {
          subject: { type: JsonSchemaTypeEnum.STRING, minLength: 1 },
        },
        required: ['subject'],
        additionalProperties: false,
      } as JSONSchemaDto,
      controlValues: {},
    });

    expect(issues.controls?.subject).toHaveLength(1);
    expect(issues.controls?.subject?.[0].message).toBe('Subject is required');
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

describe('processControlValuesByLiquid', () => {
  const issuesFor = (body: string) => {
    const issues: ControlIssues = {};
    processControlValuesByLiquid({
      currentValue: { body },
      currentPath: [],
      issues,
      variableSchema: undefined,
    });

    return issues.controls?.body;
  };

  it('accepts single-quoted Liquid and tags that span lines', () => {
    expect(issuesFor("{{ payload.name | append: '!' }}")).toBeUndefined();
    expect(issuesFor("{% if payload.name contains 'A' %}yes{% endif %}")).toBeUndefined();
    expect(issuesFor('{% if payload.a\n  and payload.b %}x{% endif %}')).toBeUndefined();
  });

  it('flags double quotes inside Liquid, which preview and delivery cannot render', () => {
    for (const body of ['{{ payload.name | append: "!" }}', '{% if payload.name contains "A" %}yes{% endif %}']) {
      expect(issuesFor(body)).toEqual([
        {
          message:
            'Content compilation error: Use single quotes for text inside {{ }} and {% %}. Double quotes (") and backslashes (\\) are not supported',
          issueType: ContentIssueEnum.ILLEGAL_VARIABLE_IN_CONTROL_VALUE,
          variableName: 'body',
        },
      ]);
    }
  });

  it('flags tags that load template files', () => {
    expect(issuesFor("{% include 'header' %}")?.[0].message).toBe(
      'Content compilation error: tag "include" is not supported'
    );
    expect(issuesFor("{% render 'footer' %}")?.[0].message).toBe(
      'Content compilation error: tag "render" is not supported'
    );
  });

  it('reports syntax errors as compilation errors without position noise', () => {
    expect(issuesFor('{% foo %}')).toEqual([
      {
        message: 'Content compilation error: tag "foo" not found',
        issueType: ContentIssueEnum.ILLEGAL_VARIABLE_IN_CONTROL_VALUE,
        variableName: '{{}}',
      },
    ]);
    expect(issuesFor('{% if payload.a %}x')?.[0].message).toBe(
      'Content compilation error: tag {% if payload.a %} not closed'
    );
  });
});
