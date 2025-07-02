import merge from 'lodash/merge';
import capitalize from 'lodash/capitalize';
import isEmpty from 'lodash/isEmpty';
import Ajv, { ErrorObject } from 'ajv';
import addFormats from 'ajv-formats';
import { AdditionalOperation, RulesLogic } from 'json-logic-js';
import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { ControlValuesRepository, IntegrationRepository } from '@novu/dal';
import {
  ControlValuesLevelEnum,
  FeatureFlagsKeysEnum,
  StepContentIssue,
  StepContentIssueEnum,
  StepIntegrationIssueEnum,
  StepIssuesDto,
  StepTypeEnum,
  UserSessionData,
  ResourceOriginEnum,
} from '@novu/shared';
import {
  dashboardSanitizeControlValues,
  FeatureFlagsService,
  Instrument,
  InstrumentUsecase,
  PinoLogger,
  TierRestrictionsValidateCommand,
  TierRestrictionsValidateUsecase,
} from '@novu/application-generic';

import { buildVariables } from '../../util/build-variables';
import { BuildVariableSchemaCommand, BuildVariableSchemaUsecase } from '../build-variable-schema';
import { BuildStepIssuesCommand } from './build-step-issues.command';
import {
  QueryIssueTypeEnum,
  QueryValidatorService,
} from '../../../shared/services/query-parser/query-validator.service';
import { parseStepVariables } from '../../util/parse-step-variables';
import { JSONSchemaDto } from '../../../shared/dtos/json-schema.dto';
import { buildLiquidParser } from '../../util/template-parser/liquid-engine';

const PAYLOAD_FIELD_PREFIX = 'payload.';
const SUBSCRIBER_DATA_FIELD_PREFIX = 'subscriber.data.';

@Injectable()
export class BuildStepIssuesUsecase {
  private parserEngine = buildLiquidParser();

  constructor(
    private buildAvailableVariableSchemaUsecase: BuildVariableSchemaUsecase,
    private controlValuesRepository: ControlValuesRepository,
    @Inject(forwardRef(() => TierRestrictionsValidateUsecase))
    private tierRestrictionsValidateUsecase: TierRestrictionsValidateUsecase,
    private logger: PinoLogger,
    private integrationsRepository: IntegrationRepository,
    private featureFlagsService: FeatureFlagsService
  ) {}

  @InstrumentUsecase()
  async execute(command: BuildStepIssuesCommand): Promise<StepIssuesDto> {
    const {
      workflowOrigin,
      user,
      stepInternalId,
      workflow: persistedWorkflow,
      controlSchema,
      controlsDto: controlValuesDto,
      stepType,
    } = command;

    const variableSchema = await this.buildAvailableVariableSchemaUsecase.execute(
      BuildVariableSchemaCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        userId: user._id,
        stepInternalId,
        workflow: persistedWorkflow,
        ...(controlValuesDto ? { optimisticControlValues: controlValuesDto } : {}),
        ...(command.optimisticSteps ? { optimisticSteps: command.optimisticSteps } : {}),
      })
    );

    let newControlValues = controlValuesDto;

    if (!newControlValues) {
      newControlValues = (
        await this.controlValuesRepository.findOne({
          _environmentId: user.environmentId,
          _organizationId: user.organizationId,
          _workflowId: persistedWorkflow?._id,
          _stepId: stepInternalId,
          level: ControlValuesLevelEnum.STEP_CONTROLS,
        })
      )?.controls;
    }

    const isHtmlEditorEnabled = await this.featureFlagsService.getFlag({
      key: FeatureFlagsKeysEnum.IS_HTML_EDITOR_ENABLED,
      organization: { _id: command.user.organizationId },
      environment: { _id: command.user.environmentId },
      user: { _id: command.user._id },
      defaultValue: false,
    });

    const sanitizedControlValues = this.sanitizeControlValues(newControlValues, workflowOrigin, stepType);

    const schemaIssues = this.processControlValuesBySchema(controlSchema, sanitizedControlValues || {}, stepType);
    const liquidIssues = this.processControlValuesByLiquid(variableSchema, newControlValues || {}, isHtmlEditorEnabled);
    const customIssues = await this.processControlValuesByCustomeRules(user, stepType, sanitizedControlValues || {});
    const skipLogicIssues = sanitizedControlValues?.skip
      ? this.validateSkipField(variableSchema, sanitizedControlValues.skip as RulesLogic<AdditionalOperation>)
      : {};
    const integrationIssues = await this.validateIntegration({
      stepType,
      environmentId: user.environmentId,
      organizationId: user.organizationId,
    });

    return merge(schemaIssues, liquidIssues, customIssues, skipLogicIssues, integrationIssues);
  }

  @Instrument()
  private sanitizeControlValues(
    newControlValues: Record<string, unknown> | undefined,
    workflowOrigin: ResourceOriginEnum,
    stepType: StepTypeEnum
  ) {
    return newControlValues && workflowOrigin === ResourceOriginEnum.NOVU_CLOUD
      ? dashboardSanitizeControlValues(this.logger, newControlValues, stepType) || {}
      : this.frameworkSanitizeEmptyStringsToNull(newControlValues) || {};
  }

  @Instrument()
  private processControlValuesByLiquid(
    variableSchema: JSONSchemaDto | undefined,
    controlValues: Record<string, unknown> | null,
    isHtmlEditorEnabled: boolean
  ): StepIssuesDto {
    const issues: StepIssuesDto = {};
    this.processNestedControlValues(controlValues, [], issues, variableSchema, isHtmlEditorEnabled);

    return issues;
  }

  @Instrument()
  private processNestedControlValues(
    currentValue: unknown,
    currentPath: string[],
    issues: StepIssuesDto,
    variableSchema: JSONSchemaDto | undefined,
    isHtmlEditorEnabled: boolean
  ): void {
    if (!currentValue || typeof currentValue !== 'object') {
      const liquidTemplateIssues = buildVariables({
        useNewLiquidParser: isHtmlEditorEnabled,
        variableSchema,
        controlValue: currentValue,
        logger: this.logger,
      });

      // Prioritize invalid variable validation over content compilation since it provides more granular error details
      if (liquidTemplateIssues.invalidVariables.length > 0) {
        const controlKey = currentPath.join('.');

        // eslint-disable-next-line no-param-reassign
        issues.controls = issues.controls || {};

        // eslint-disable-next-line no-param-reassign
        issues.controls[controlKey] = liquidTemplateIssues.invalidVariables.map((invalidVariable) => {
          const message = invalidVariable.message ? invalidVariable.message.split(' line:')[0] : '';
          if ('filterMessage' in invalidVariable) {
            return {
              message: `Filter "${invalidVariable.filterMessage}" in "${invalidVariable.name}"`,
              issueType: StepContentIssueEnum.INVALID_FILTER_ARG_IN_VARIABLE,
              variableName: invalidVariable.name,
            };
          }

          return {
            message: `Variable "${invalidVariable.name}" ${message}`.trim(),
            issueType: StepContentIssueEnum.ILLEGAL_VARIABLE_IN_CONTROL_VALUE,
            variableName: invalidVariable.name,
          };
        });
      } else {
        const contentControlKey = currentPath.join('.');
        const contentIssue = this.validateContentCompilation(contentControlKey, currentValue);
        if (contentIssue) {
          // eslint-disable-next-line no-param-reassign
          issues.controls = issues.controls || {};
          // eslint-disable-next-line no-param-reassign
          issues.controls[contentControlKey] = [contentIssue];

          return;
        }
      }

      return;
    }

    for (const [key, value] of Object.entries(currentValue)) {
      this.processNestedControlValues(value, [...currentPath, key], issues, variableSchema, isHtmlEditorEnabled);
    }
  }

  private validateContentCompilation(controlKey: string, currentValue: unknown): StepContentIssue | null {
    try {
      this.parserEngine.parse(typeof currentValue === 'string' ? currentValue : JSON.stringify(currentValue));

      return null;
    } catch (error) {
      const message = error.message ? error.message.split(', line:1')[0] || error.message.split(' line:1')[0] : '';

      return {
        message: `Content compilation error: ${message}`.trim(),
        issueType: StepContentIssueEnum.ILLEGAL_VARIABLE_IN_CONTROL_VALUE,
        variableName: controlKey,
      };
    }
  }

  @Instrument()
  private processControlValuesBySchema(
    controlSchema: JSONSchemaDto | undefined,
    controlValues: Record<string, unknown> | null,
    stepType: StepTypeEnum
  ): StepIssuesDto {
    let issues: StepIssuesDto = {};

    if (!controlSchema || !controlValues) {
      return issues;
    }

    const ajv = new Ajv({ allErrors: true });
    addFormats(ajv);
    const validate = ajv.compile(controlSchema);
    const isValid = validate(controlValues);
    const errors = validate.errors as null | ErrorObject[];

    if (!isValid && errors && errors?.length !== 0 && controlValues) {
      issues = {
        controls: errors.reduce(
          (acc, error) => {
            const path = this.getErrorPath(error);
            if (!acc[path]) {
              acc[path] = [];
            }
            acc[path].push({
              message: this.mapAjvErrorToMessage(error, stepType),
              issueType: this.mapAjvErrorToIssueType(error),
              variableName: path,
            });

            return acc;
          },
          {} as Record<string, StepContentIssue[]>
        ),
      };

      return issues;
    }

    return issues;
  }

  @Instrument()
  private async processControlValuesByCustomeRules(
    user: UserSessionData,
    stepType: StepTypeEnum,
    controlValues: Record<string, unknown> | null
  ): Promise<StepIssuesDto> {
    const restrictionsErrors = await this.tierRestrictionsValidateUsecase.execute(
      TierRestrictionsValidateCommand.create({
        amount: controlValues?.amount as number | undefined,
        unit: controlValues?.unit as string | undefined,
        cron: controlValues?.cron as string | undefined,
        organizationId: user.organizationId,
        stepType,
      })
    );

    if (!restrictionsErrors) {
      return {};
    }

    const result: Record<string, StepContentIssue[]> = {};
    for (const restrictionsError of restrictionsErrors) {
      result[restrictionsError.controlKey] = [
        {
          issueType: StepContentIssueEnum.TIER_LIMIT_EXCEEDED,
          message: restrictionsError.message,
        },
      ];
    }

    return isEmpty(result) ? {} : { controls: result };
  }

  private getErrorPath(error: ErrorObject): string {
    const path = error.instancePath.substring(1);
    const { missingProperty } = error.params;

    if (!path || path.trim().length === 0) {
      return missingProperty;
    }

    const fullPath = missingProperty ? `${path}/${missingProperty}` : path;

    return fullPath?.replace(/\//g, '.');
  }

  private frameworkSanitizeEmptyStringsToNull(
    obj: Record<string, unknown> | undefined | null
  ): Record<string, unknown> | undefined | null {
    if (typeof obj !== 'object' || obj === null || obj === undefined) return obj;

    return Object.fromEntries(
      Object.entries(obj).map(([key, value]) => {
        if (typeof value === 'string' && value.trim() === '') {
          return [key, null];
        }
        if (typeof value === 'object') {
          return [key, this.frameworkSanitizeEmptyStringsToNull(value as Record<string, unknown>)];
        }

        return [key, value];
      })
    );
  }

  private mapAjvErrorToIssueType(error: ErrorObject): StepContentIssueEnum {
    switch (error.keyword) {
      case 'required':
        return StepContentIssueEnum.MISSING_VALUE;
      case 'type':
        return StepContentIssueEnum.MISSING_VALUE;
      default:
        return StepContentIssueEnum.MISSING_VALUE;
    }
  }

  private mapAjvErrorToMessage(
    error: ErrorObject<string, Record<string, unknown>, unknown>,
    stepType: StepTypeEnum
  ): string {
    if (stepType === StepTypeEnum.IN_APP) {
      if (error.keyword === 'required') {
        return 'Subject or body is required';
      }
      if (error.keyword === 'minLength') {
        return `${capitalize(error.instancePath.replace('/', ''))} is required`;
      }
    }

    if (error.keyword === 'required') {
      return `${capitalize(error.params.missingProperty)} is required`;
    }
    if (error.keyword === 'minLength') {
      return `${capitalize(error.instancePath.replace('/', ''))} is required`;
    }
    if (
      error.keyword === 'pattern' &&
      error.message?.includes('must match pattern') &&
      error.message?.includes('mailto') &&
      error.message?.includes('https')
    ) {
      return `Invalid URL. Must be a valid full URL, path starting with /, or {{variable}}`;
    }

    return error.message || 'Invalid value';
  }

  @Instrument()
  private validateSkipField(variableSchema: JSONSchemaDto, skipLogic: RulesLogic<AdditionalOperation>): StepIssuesDto {
    const issues: StepIssuesDto = {};
    const { primitives } = parseStepVariables(variableSchema);
    const allowedVariables = primitives.map((variable) => variable.name);
    const allowedNamespaces = [PAYLOAD_FIELD_PREFIX, SUBSCRIBER_DATA_FIELD_PREFIX];

    const queryValidatorService = new QueryValidatorService(allowedVariables, allowedNamespaces);
    const skipRulesIssues = queryValidatorService.validateQueryRules(skipLogic);

    if (skipRulesIssues.length > 0) {
      issues.controls = {
        skip: skipRulesIssues.map((issue) => ({
          issueType:
            issue.type === QueryIssueTypeEnum.MISSING_VALUE
              ? StepContentIssueEnum.MISSING_VALUE
              : StepContentIssueEnum.ILLEGAL_VARIABLE_IN_CONTROL_VALUE,
          message: issue.message,
          variableName: issue.path.join('.'),
        })),
      };
    }

    return issues.controls?.skip.length ? issues : {};
  }

  @Instrument()
  private async validateIntegration(args: {
    stepType: StepTypeEnum;
    environmentId: string;
    organizationId: string;
  }): Promise<StepIssuesDto> {
    const issues: StepIssuesDto = {};

    const integrationNeeded = [
      StepTypeEnum.EMAIL,
      StepTypeEnum.SMS,
      StepTypeEnum.IN_APP,
      StepTypeEnum.PUSH,
      StepTypeEnum.CHAT,
    ].includes(args.stepType);

    if (!integrationNeeded) {
      return issues;
    }

    const primaryNeeded = args.stepType === StepTypeEnum.EMAIL || args.stepType === StepTypeEnum.SMS;
    const validIntegrationForStep = await this.integrationsRepository.findOne({
      _environmentId: args.environmentId,
      _organizationId: args.organizationId,
      active: true,
      ...(primaryNeeded && { primary: true }),
      channel: args.stepType,
    });

    if (validIntegrationForStep) {
      return issues;
    }

    issues.integration = {
      [args.stepType]: [
        {
          issueType: StepIntegrationIssueEnum.MISSING_INTEGRATION,
          message: `Missing active ${primaryNeeded ? 'primary' : ''} integration provider`,
        },
      ],
    };

    return issues;
  }
}
