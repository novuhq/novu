import { forwardRef, Inject, Injectable } from '@nestjs/common';
import {
  dashboardSanitizeControlValues,
  Instrument,
  InstrumentUsecase,
  PinoLogger,
  TierRestrictionsValidateCommand,
  TierRestrictionsValidateUsecase,
} from '@novu/application-generic';
import { ControlValuesRepository, IntegrationRepository } from '@novu/dal';
import {
  ContentIssueEnum,
  ControlValuesLevelEnum,
  IntegrationIssueEnum,
  ResourceOriginEnum,
  RuntimeIssue,
  StepIssuesDto,
  StepTypeEnum,
  UserSessionData,
} from '@novu/shared';
import { AdditionalOperation, RulesLogic } from 'json-logic-js';
import isEmpty from 'lodash/isEmpty';
import merge from 'lodash/merge';
import { JSONSchemaDto } from '../../../shared/dtos/json-schema.dto';
import {
  QueryIssueTypeEnum,
  QueryValidatorService,
} from '../../../shared/services/query-parser/query-validator.service';
import {
  ControlIssues,
  processControlValuesByLiquid,
  processControlValuesBySchema,
} from '../../../shared/utils/issues';
import { parseStepVariables } from '../../util/parse-step-variables';
import { BuildVariableSchemaCommand, BuildVariableSchemaUsecase } from '../build-variable-schema';
import { BuildStepIssuesCommand } from './build-step-issues.command';

const PAYLOAD_FIELD_PREFIX = 'payload.';
const SUBSCRIBER_DATA_FIELD_PREFIX = 'subscriber.data.';

@Injectable()
export class BuildStepIssuesUsecase {
  constructor(
    private buildAvailableVariableSchemaUsecase: BuildVariableSchemaUsecase,
    private controlValuesRepository: ControlValuesRepository,
    @Inject(forwardRef(() => TierRestrictionsValidateUsecase))
    private tierRestrictionsValidateUsecase: TierRestrictionsValidateUsecase,
    private logger: PinoLogger,
    private integrationsRepository: IntegrationRepository
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

    const sanitizedControlValues = this.sanitizeControlValues(newControlValues, workflowOrigin, stepType);

    const schemaIssues = processControlValuesBySchema({
      controlSchema,
      controlValues: sanitizedControlValues || {},
      stepType,
    });
    const liquidIssues: ControlIssues = {};
    processControlValuesByLiquid({
      variableSchema,
      currentValue: newControlValues || {},
      currentPath: [],
      issues: liquidIssues,
    });
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

    const result: Record<string, RuntimeIssue[]> = {};
    for (const restrictionsError of restrictionsErrors) {
      result[restrictionsError.controlKey] = [
        {
          issueType: ContentIssueEnum.TIER_LIMIT_EXCEEDED,
          message: restrictionsError.message,
        },
      ];
    }

    return isEmpty(result) ? {} : { controls: result };
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
              ? ContentIssueEnum.MISSING_VALUE
              : ContentIssueEnum.ILLEGAL_VARIABLE_IN_CONTROL_VALUE,
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

    if (args.stepType === StepTypeEnum.IN_APP) {
      if (!validIntegrationForStep || !validIntegrationForStep.connected) {
        issues.integration = {
          [args.stepType]: [
            {
              issueType: IntegrationIssueEnum.MISSING_INTEGRATION,
              message: validIntegrationForStep
                ? 'Inbox is not connected. Please connect your Inbox integration.'
                : 'Missing active integration provider',
            },
          ],
        };
      }
      return issues;
    }

    if (!validIntegrationForStep) {
      issues.integration = {
        [args.stepType]: [
          {
            issueType: IntegrationIssueEnum.MISSING_INTEGRATION,
            message: `Missing active${primaryNeeded ? ' primary' : ''} integration provider`,
          },
        ],
      };
    }

    return issues;
  }
}
