import { Injectable, InternalServerErrorException } from '@nestjs/common';
import _ from 'lodash';
import get from 'lodash/get';
import Ajv, { ErrorObject } from 'ajv';
import addFormats from 'ajv-formats';
import { captureException } from '@sentry/node';
import {
  EnvironmentEntity,
  NotificationTemplateEntity,
  OrganizationEntity,
  UserEntity,
  JsonSchemaTypeEnum,
  JsonSchemaFormatEnum,
} from '@novu/dal';

import {
  ChannelTypeEnum,
  createMockObjectFromSchema,
  FeatureFlagsKeysEnum,
  JobStatusEnum,
  StepTypeEnum,
  WorkflowOriginEnum,
} from '@novu/shared';
import {
  dashboardSanitizeControlValues,
  FeatureFlagsService,
  GetWorkflowByIdsCommand,
  GetWorkflowByIdsUseCase,
  Instrument,
  InstrumentUsecase,
  PinoLogger,
} from '@novu/application-generic';
import { actionStepSchemas, channelStepSchemas } from '@novu/framework/internal';
import { JSONContent as MailyJSONContent } from '@maily-to/render';
import { PreviewStep, PreviewStepCommand } from '../../../bridge/usecases/preview-step';
import { FrameworkPreviousStepsOutputState } from '../../../bridge/usecases/preview-step/preview-step.command';
import { BuildStepDataUsecase } from '../build-step-data';
import { PreviewCommand } from './preview.command';
import { CreateVariablesObjectCommand } from '../create-variables-object/create-variables-object.command';
import { CreateVariablesObject } from '../create-variables-object/create-variables-object.usecase';
import { buildLiquidParser, Variable } from '../../util/template-parser/liquid-parser';
import { buildVariables } from '../../util/build-variables';
import { mergeCommonObjectKeys } from '../../util/utils';
import { buildVariablesSchema } from '../../util/create-schema';
import { GeneratePreviewResponseDto, JSONSchemaDto, PreviewPayloadDto, StepResponseDto } from '../../dtos';
import {
  replaceMailyVariables,
  isStringifiedMailyJSONContent,
  isObjectMailyJSONContent,
} from '../../../shared/helpers/maily-utils';
import { JsonSchemaMock } from '../../util/json-schema-mock';

const LOG_CONTEXT = 'GeneratePreviewUsecase';

@Injectable()
export class PreviewUsecase {
  constructor(
    private previewStepUsecase: PreviewStep,
    private buildStepDataUsecase: BuildStepDataUsecase,
    private getWorkflowByIdsUseCase: GetWorkflowByIdsUseCase,
    private createVariablesObject: CreateVariablesObject,
    private readonly logger: PinoLogger,
    private readonly featureFlagService: FeatureFlagsService
  ) {}

  @InstrumentUsecase()
  async execute(command: PreviewCommand): Promise<GeneratePreviewResponseDto> {
    try {
      const { generatePreviewRequestDto } = command;

      const {
        stepData,
        controlValues: initialControlValues,
        variableSchema,
        variablesObject,
        workflow,
      } = await this.initializePreviewContext(command);
      const userPayloadExample = generatePreviewRequestDto.previewPayload;

      /**
       * We don't want to sanitize control values for code workflows,
       * as it's the responsibility of the custom code workflow creator
       */
      const sanitizedValidatedControls =
        workflow.origin === WorkflowOriginEnum.NOVU_CLOUD
          ? this.sanitizeControlsForPreview(initialControlValues, stepData)
          : initialControlValues;

      if (!sanitizedValidatedControls && workflow.origin === WorkflowOriginEnum.NOVU_CLOUD) {
        throw new Error(
          // eslint-disable-next-line max-len
          'Control values normalization failed, normalizeControlValues function requires maintenance to sanitize the provided type or data structure correctly'
        );
      }

      let previewTemplateData = {
        payloadExample: {},
        controlValues: {},
      };

      for (const [controlKey, controlValue] of Object.entries(sanitizedValidatedControls || {})) {
        const variables = buildVariables(variableSchema, controlValue, this.logger);

        const controlValueWithFixedVariables = this.fixControlValueInvalidVariables(
          controlValue,
          variables.invalidVariables
        );

        const processedControlValues = this.sanitizeControlValuesByLiquidCompilationFailure(
          controlKey,
          controlValueWithFixedVariables
        );

        previewTemplateData = {
          payloadExample: _.merge(previewTemplateData.payloadExample, variablesObject),
          controlValues: {
            ...previewTemplateData.controlValues,
            [controlKey]: isObjectMailyJSONContent(processedControlValues)
              ? JSON.stringify(processedControlValues)
              : processedControlValues,
          },
        };
      }

      let previewPayloadExample = await this.mergePayloadExample(
        workflow,
        previewTemplateData.payloadExample,
        userPayloadExample
      );

      previewPayloadExample = enhanceEventCountValue(previewPayloadExample);

      const executeOutput = await this.executePreviewUsecase(
        command,
        stepData,
        previewPayloadExample,
        previewTemplateData.controlValues
      );

      return {
        result: {
          preview: executeOutput.outputs as any,
          type: stepData.type as unknown as ChannelTypeEnum,
        },
        previewPayloadExample: cleanPreviewExamplePayload(previewPayloadExample),
        schema: this.buildPreviewPayloadSchema(previewPayloadExample, workflow.payloadSchema),
      };
    } catch (error) {
      this.logger.error(
        {
          err: error,
          workflowIdOrInternalId: command.workflowIdOrInternalId,
          stepIdOrInternalId: command.stepIdOrInternalId,
        },
        `Unexpected error while generating preview`,
        LOG_CONTEXT
      );
      if (process.env.SENTRY_DSN) {
        captureException(error);
      }

      return {
        result: {
          preview: {},
          type: undefined,
        },
        previewPayloadExample: {},
        schema: null,
      } as any;
    }
  }

  private sanitizeControlsForPreview(initialControlValues: Record<string, unknown>, stepData: StepResponseDto) {
    const sanitizedValues = dashboardSanitizeControlValues(this.logger, initialControlValues, stepData.type);
    const sanitizedByOutputSchema = sanitizeControlValuesByOutputSchema(sanitizedValues || {}, stepData.type);

    return sanitizedByOutputSchema;
  }

  /**
   * Merge the payload example with the user payload example.
   * Preserve only values of common keys between payloadExample and userPayloadExample.
   */
  private async mergePayloadExample(
    workflow: NotificationTemplateEntity,
    payloadExample: Record<string, unknown>,
    userPayloadExample: PreviewPayloadDto | undefined
  ) {
    const isPayloadSchemaEnabled = await this.featureFlagService.getFlag({
      key: FeatureFlagsKeysEnum.IS_PAYLOAD_SCHEMA_ENABLED,
      defaultValue: false,
      organization: { _id: workflow._organizationId },
      environment: { _id: workflow._environmentId },
    });

    const shouldUsePayloadSchema =
      workflow.origin === WorkflowOriginEnum.EXTERNAL ||
      (isPayloadSchemaEnabled && workflow.origin === WorkflowOriginEnum.NOVU_CLOUD);

    if (shouldUsePayloadSchema && workflow.payloadSchema) {
      let schemaBasedPayloadExample: Record<string, unknown>;

      if (isPayloadSchemaEnabled) {
        // Use JSON schema faker for more realistic mock data
        try {
          const schema = {
            type: 'object' as const,
            properties: { payload: workflow.payloadSchema },
            additionalProperties: false,
          };

          const mockData = JsonSchemaMock.generate(schema) as Record<string, unknown>;
          schemaBasedPayloadExample = mockData;
        } catch (error) {
          this.logger.warn(
            {
              err: error,
              workflowId: workflow._id,
              payloadSchema: workflow.payloadSchema,
            },
            'Failed to generate mock data using JSON schema faker, falling back to createMockObjectFromSchema',
            LOG_CONTEXT
          );
          // Fallback to the original method
          schemaBasedPayloadExample = createMockObjectFromSchema({
            type: 'object',
            properties: { payload: workflow.payloadSchema },
          });
        }
      } else {
        // Use the original method for external workflows when feature flag is disabled
        schemaBasedPayloadExample = createMockObjectFromSchema({
          type: 'object',
          properties: { payload: workflow.payloadSchema },
        });
      }

      // Start with base payload example, then add schema-based mock data
      let mergedPayload = _.merge({}, payloadExample, schemaBasedPayloadExample);

      // If user provided payload example, apply it with special handling for arrays
      if (userPayloadExample && Object.keys(userPayloadExample).length > 0) {
        mergedPayload = _.mergeWith(
          mergedPayload,
          userPayloadExample as Record<string, unknown>,
          (objValue, srcValue) => {
            // If source value is an array, completely replace target array
            if (Array.isArray(srcValue)) {
              return srcValue;
            }

            // Otherwise, let lodash handle normal merging
            return undefined;
          }
        );
      }

      return mergedPayload;
    }

    if (userPayloadExample && Object.keys(userPayloadExample).length > 0) {
      return mergeCommonObjectKeys(
        userPayloadExample as Record<string, unknown>, // treat the FE payload as target
        payloadExample as Record<string, unknown> // treat the BE payload as source
      );
    }

    return payloadExample;
  }

  private async initializePreviewContext(command: PreviewCommand) {
    // get step with control values, variables, issues etc.
    const stepData = await this.getStepData(command);
    const controlValues = command.generatePreviewRequestDto.controlValues || stepData.controls.values || {};
    const workflow = await this.findWorkflow(command);

    // extract all variables from the control values and build the variables object
    const variablesObject = await this.createVariablesObject.execute(
      CreateVariablesObjectCommand.create({
        environmentId: command.user.environmentId,
        organizationId: command.user.organizationId,
        userId: command.user._id,
        workflowId: command.workflowIdOrInternalId,
        controlValues,
        payloadSchema: workflow.payloadSchema,
      })
    );

    // build the payload schema and merge it with the variables schema
    const variableSchema = await this.buildVariablesSchema(variablesObject, stepData.variables);

    return { stepData, controlValues, variableSchema, variablesObject, workflow };
  }

  @Instrument()
  private async buildVariablesSchema(variablesObject: Record<string, unknown>, variables: JSONSchemaDto) {
    const { payload } = variablesObject;
    const payloadSchema = buildVariablesSchema(payload);

    if (Object.keys(payloadSchema).length === 0) {
      return variables;
    }

    return _.merge(variables, { properties: { payload: payloadSchema } });
  }

  @Instrument()
  private async findWorkflow(command: PreviewCommand) {
    return await this.getWorkflowByIdsUseCase.execute(
      GetWorkflowByIdsCommand.create({
        workflowIdOrInternalId: command.workflowIdOrInternalId,
        environmentId: command.user.environmentId,
        organizationId: command.user.organizationId,
      })
    );
  }

  @Instrument()
  private async getStepData(command: PreviewCommand) {
    return await this.buildStepDataUsecase.execute({
      workflowIdOrInternalId: command.workflowIdOrInternalId,
      stepIdOrInternalId: command.stepIdOrInternalId,
      user: command.user,
    });
  }

  private isFrameworkError(obj: any): obj is FrameworkError {
    return typeof obj === 'object' && obj.status === '400' && obj.name === 'BridgeRequestError';
  }

  @Instrument()
  private async executePreviewUsecase(
    command: PreviewCommand,
    stepData: StepResponseDto,
    previewPayloadExample: PreviewPayloadDto,
    controlValues: Record<string, unknown>
  ) {
    const state = buildState(previewPayloadExample.steps);

    try {
      return await this.previewStepUsecase.execute(
        PreviewStepCommand.create({
          payload: previewPayloadExample.payload || {},
          subscriber: previewPayloadExample.subscriber,
          controls: controlValues || {},
          environmentId: command.user.environmentId,
          organizationId: command.user.organizationId,
          stepId: stepData.stepId,
          userId: command.user._id,
          workflowId: stepData.workflowId,
          workflowOrigin: stepData.origin,
          state,
        })
      );
    } catch (error) {
      if (this.isFrameworkError(error)) {
        throw new GeneratePreviewError(error);
      } else {
        throw error;
      }
    }
  }

  /**
   * Fix the control values that have invalid variables used and replace them with empty strings
   */
  private fixControlValueInvalidVariables(controlValue: unknown, invalidVariables: Variable[]): unknown {
    try {
      const EMPTY_STRING = '';
      const isMailyJSONContent = isStringifiedMailyJSONContent(controlValue);
      let controlValuesString = isMailyJSONContent ? controlValue : JSON.stringify(controlValue);

      for (const invalidVariable of invalidVariables) {
        let variableOutput = invalidVariable.output;

        if (isMailyJSONContent) {
          variableOutput = variableOutput.replace(/\{\{|\}\}/g, '').trim();
          controlValuesString = JSON.stringify(
            replaceMailyVariables(controlValuesString, variableOutput, EMPTY_STRING)
          );
          continue;
        }

        if (!controlValuesString.includes(variableOutput)) {
          continue;
        }

        controlValuesString = replaceAll(controlValuesString, variableOutput, EMPTY_STRING);
      }

      return JSON.parse(controlValuesString);
    } catch (error) {
      return controlValue;
    }
  }

  /*
   * Sanitize control values after fixing (by fixControlValueInvalidVariables) invalid variables,
   * to avoid defaulting (by previewControlValueDefault) all values
   */
  private sanitizeControlValuesByLiquidCompilationFailure(key: string, value: unknown): unknown {
    const parserEngine = buildLiquidParser();

    try {
      parserEngine.parse(JSON.stringify(value));

      return value;
    } catch (error) {
      return get(previewControlValueDefault, key);
    }
  }

  private buildPreviewPayloadSchema(
    previewPayloadExample: PreviewPayloadDto,
    workflowPayloadSchema?: JSONSchemaDto
  ): JSONSchemaDto | null {
    if (!workflowPayloadSchema) {
      return null;
    }

    const schema: JSONSchemaDto = {
      type: JsonSchemaTypeEnum.OBJECT,
      properties: {},
      additionalProperties: false,
    };

    // Add payload schema if it exists in the example
    if (previewPayloadExample.payload) {
      schema.properties!.payload = workflowPayloadSchema || {
        type: JsonSchemaTypeEnum.OBJECT,
        additionalProperties: true,
      };
    }

    // Add subscriber schema if it exists in the example
    if (previewPayloadExample.subscriber) {
      schema.properties!.subscriber = {
        type: JsonSchemaTypeEnum.OBJECT,
        properties: {
          subscriberId: { type: JsonSchemaTypeEnum.STRING },
          firstName: { type: JsonSchemaTypeEnum.STRING },
          lastName: { type: JsonSchemaTypeEnum.STRING },
          email: { type: JsonSchemaTypeEnum.STRING, format: JsonSchemaFormatEnum.EMAIL },
          phone: { type: JsonSchemaTypeEnum.STRING },
          avatar: { type: JsonSchemaTypeEnum.STRING },
          locale: { type: JsonSchemaTypeEnum.STRING },
          data: { type: JsonSchemaTypeEnum.OBJECT, additionalProperties: true },
        },
        additionalProperties: true,
      };
    }

    // Add steps schema if it exists in the example
    if (previewPayloadExample.steps) {
      schema.properties!.steps = {
        type: JsonSchemaTypeEnum.OBJECT,
        description: 'Steps data from previous workflow executions',
        additionalProperties: {
          type: JsonSchemaTypeEnum.OBJECT,
          properties: {
            events: {
              type: JsonSchemaTypeEnum.ARRAY,
              items: {
                type: JsonSchemaTypeEnum.OBJECT,
                properties: {
                  payload: { type: JsonSchemaTypeEnum.OBJECT, additionalProperties: true },
                },
                additionalProperties: true,
              },
            },
          },
          additionalProperties: true,
        },
      };
    }

    return schema;
  }
}

/**
 * Clean the preview payload example before returning to remove digest eventCount, events.length and ensure events array exists
 */
function cleanPreviewExamplePayload(payloadExample: Record<string, unknown>): Record<string, unknown> {
  const cleanedPayloadExample = _.cloneDeep(payloadExample);

  if (cleanedPayloadExample.steps && typeof cleanedPayloadExample.steps === 'object') {
    const steps = cleanedPayloadExample.steps as Record<string, unknown>;

    Object.keys(steps)
      .filter((stepId) => typeof steps[stepId] === 'object')
      .forEach((stepId) => {
        const step = steps[stepId] as Record<string, unknown>;

        // remove eventCount prop
        delete step.eventCount;

        // remove events.length prop
        if (step.events && typeof step.events === 'object' && !Array.isArray(step.events)) {
          delete (step.events as Record<string, unknown>).length;
        }
      });
  }

  return cleanedPayloadExample;
}

/**
 * Prepares the payload for the bridge request by ensuring eventCount is calculated from events length
 */
function enhanceEventCountValue(payloadExample: PreviewPayloadDto): Record<string, Record<string, unknown>> {
  const preparedPayload = _.cloneDeep(payloadExample);

  if (preparedPayload.steps && typeof preparedPayload.steps === 'object') {
    const steps = preparedPayload.steps as Record<string, unknown>;

    Object.keys(steps)
      .filter((stepId) => typeof steps[stepId] === 'object')
      .forEach((stepId) => {
        const step = steps[stepId] as Record<string, unknown>;

        // calculate eventCount based on events array length
        step.eventCount = Array.isArray(step.events) ? step.events.length : 0;
      });
  }

  return preparedPayload;
}

function buildState(steps: Record<string, unknown> | undefined): FrameworkPreviousStepsOutputState[] {
  const outputArray: FrameworkPreviousStepsOutputState[] = [];
  for (const [stepId, value] of Object.entries(steps || {})) {
    outputArray.push({
      stepId,
      outputs: value as Record<string, unknown>,
      state: {
        status: JobStatusEnum.COMPLETED,
      },
    });
  }

  return outputArray;
}

/**
 * Replaces all occurrences of a search string with a replacement string.
 */
export function replaceAll(text: string, searchValue: string, replaceValue: string): string {
  return _.replace(text, new RegExp(_.escapeRegExp(searchValue), 'g'), replaceValue);
}

export class GeneratePreviewError extends InternalServerErrorException {
  constructor(error: FrameworkError) {
    super({
      message: `GeneratePreviewError: Original Message:`,
      frameworkMessage: error.response.message,
      code: error.response.code,
      data: error.response.data,
    });
  }
}

class FrameworkError {
  response: {
    message: string;
    code: string;
    data: unknown;
  };
  status: number;
  options: Record<string, unknown>;
  message: string;
  name: string;
}

function sanitizeControlValuesByOutputSchema(
  controlValues: Record<string, unknown>,
  type: StepTypeEnum
): Record<string, unknown> {
  const outputSchema = channelStepSchemas[type].output || actionStepSchemas[type].output;

  if (!outputSchema || !controlValues) {
    return controlValues;
  }

  const ajv = new Ajv({ allErrors: true });
  addFormats(ajv);
  const validate = ajv.compile(outputSchema);
  const isValid = validate(controlValues);
  const errors = validate.errors as null | ErrorObject[];

  if (isValid || !errors || errors?.length === 0) {
    return controlValues;
  }

  return replaceInvalidControlValues(controlValues, errors);
}

/**
 * Fixes invalid control values by applying default values from the schema
 *
 * @example
 * // Input:
 * const values = { foo: 'invalid' };
 * const errors = [{ instancePath: '/foo' }];
 * const defaults = { foo: 'default' };
 *
 * // Output:
 * const fixed = { foo: 'default' };
 */
function replaceInvalidControlValues(
  normalizedControlValues: Record<string, unknown>,
  errors: ErrorObject[]
): Record<string, unknown> {
  const fixedValues = _.cloneDeep(normalizedControlValues);

  for (const error of errors) {
    /*
     *  we allow additional properties in control values compare to output
     *  such as skip and disableOutputSanitization
     */
    if (error.keyword === 'additionalProperties') {
      continue;
    }

    const path = getErrorPath(error);
    const defaultValue = _.get(previewControlValueDefault, path);
    _.set(fixedValues, path, defaultValue);
  }

  return fixedValues;
}

/*
 * Extracts the path from the error object:
 * 1. If instancePath exists, removes leading slash and converts remaining slashes to dots
 * 2. If no instancePath, uses missingProperty from error params
 * Example: "/foo/bar" becomes "foo.bar"
 */
function getErrorPath(error: ErrorObject): string {
  return (error.instancePath.substring(1) || error.params.missingProperty).replace(/\//g, '.');
}

const EMPTY_STRING = '';
const WHITESPACE = ' ';
const DEFAULT_URL_TARGET = '_blank';
const DEFAULT_URL_PATH = 'https://www.redirect-example.com';
const DEFAULT_TIP_TAP_EMPTY_PREVIEW: MailyJSONContent = {
  type: 'doc',
  content: [
    {
      type: 'paragraph',
      attrs: {
        textAlign: 'left',
      },
      content: [
        {
          type: 'text',
          text: EMPTY_STRING,
        },
      ],
    },
  ],
};

/**
 * Default control values used specifically for preview purposes.
 * These values are designed to be parsable by Liquid.js and provide
 * safe fallback values when generating preview.
 */
export const previewControlValueDefault = {
  subject: EMPTY_STRING,
  body: WHITESPACE,
  avatar: DEFAULT_URL_PATH,
  emailEditor: DEFAULT_TIP_TAP_EMPTY_PREVIEW,
  data: {},
  'primaryAction.label': EMPTY_STRING,
  'primaryAction.redirect.url': DEFAULT_URL_PATH,
  'primaryAction.redirect.target': DEFAULT_URL_TARGET,
  'secondaryAction.label': EMPTY_STRING,
  'secondaryAction.redirect.url': DEFAULT_URL_PATH,
  'secondaryAction.redirect.target': DEFAULT_URL_TARGET,
  'redirect.url': DEFAULT_URL_PATH,
  'redirect.target': DEFAULT_URL_TARGET,
} as const;
