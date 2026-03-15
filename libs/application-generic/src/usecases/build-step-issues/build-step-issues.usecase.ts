import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { ControlValuesRepository } from '@novu/dal';
import {
  ContentIssueEnum,
  ControlValuesLevelEnum,
  ResourceOriginEnum,
  RuntimeIssue,
  StepIssuesDto,
  StepTypeEnum,
  UserSessionData,
} from '@novu/shared';
import { isEmpty, merge } from 'es-toolkit/compat';
import { AdditionalOperation, RulesLogic } from 'json-logic-js';
import { PinoLogger } from 'nestjs-pino';
import { JSONSchemaDto } from '../../dtos/json-schema.dto';
import { Instrument, InstrumentUsecase } from '../../instrumentation';
import { QueryIssueTypeEnum, QueryValidatorService } from '../../services/query-parser/query-validator.service';
import { dashboardSanitizeControlValues } from '../../utils';
import { ControlIssues, processControlValuesByLiquid, processControlValuesBySchema } from '../../utils/issues';
import { parseStepVariables } from '../../utils/parse-step-variables';
import { isStepResolverActive } from '../../utils/step-resolver-control-state';
import { BuildVariableSchemaCommand, BuildVariableSchemaUsecase } from '../build-variable-schema';
import { TierRestrictionsValidateCommand, TierRestrictionsValidateUsecase } from '../tier-restrictions-validate';
import { BuildStepIssuesCommand } from './build-step-issues.command';

const PAYLOAD_FIELD_PREFIX = 'payload.';
const SUBSCRIBER_DATA_FIELD_PREFIX = 'subscriber.data.';
const CONTEXT_FIELD_PREFIX = 'context.';

@Injectable()
export class BuildStepIssuesUsecase {
  constructor(
    private buildAvailableVariableSchemaUsecase: BuildVariableSchemaUsecase,
    private controlValuesRepository: ControlValuesRepository,
    @Inject(forwardRef(() => TierRestrictionsValidateUsecase))
    private tierRestrictionsValidateUsecase: TierRestrictionsValidateUsecase,
    private logger: PinoLogger
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
      preloadedControlValues,
      optimisticPayloadSchema,
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
        ...(preloadedControlValues ? { preloadedControlValues } : {}),
        ...(optimisticPayloadSchema ? { optimisticPayloadSchema } : {}),
      })
    );

    let newControlValues = controlValuesDto;

    if (!newControlValues) {
      if (preloadedControlValues && stepInternalId) {
        newControlValues = preloadedControlValues.find((cv) => cv._stepId === stepInternalId)?.controls;
      } else {
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
    }

    const isStepResolverStep = this.isStepResolverStep(persistedWorkflow, stepInternalId);
    const sanitizedControlValues = this.sanitizeControlValues(
      newControlValues,
      workflowOrigin,
      stepType,
      isStepResolverStep
    );
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

    return merge(schemaIssues, liquidIssues, customIssues, skipLogicIssues);
  }

  @Instrument()
  private sanitizeControlValues(
    newControlValues: Record<string, unknown> | undefined,
    workflowOrigin: ResourceOriginEnum,
    stepType: StepTypeEnum,
    isStepResolverStep = false
  ) {
    return newControlValues && workflowOrigin === ResourceOriginEnum.NOVU_CLOUD && !isStepResolverStep
      ? dashboardSanitizeControlValues(this.logger, newControlValues, stepType) || {}
      : this.frameworkSanitizeEmptyStringsToNull(newControlValues) || {};
  }

  private isStepResolverStep(persistedWorkflow?: BuildStepIssuesCommand['workflow'], stepInternalId?: string): boolean {
    if (!persistedWorkflow || !stepInternalId) {
      return false;
    }

    const currentStep = persistedWorkflow.steps.find(
      (step) => step._id === stepInternalId || step._templateId === stepInternalId
    );

    return isStepResolverActive(currentStep?.template?.stepResolverHash);
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
        type: controlValues?.type as string | undefined,
        dynamicKey: controlValues?.dynamicKey as string | undefined,
        organizationId: user.organizationId,
        environmentId: user.environmentId,
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

    if (Array.isArray(obj)) {
      return obj.map((item) => {
        if (typeof item === 'string' && item.trim() === '') {
          return null;
        }
        if (typeof item === 'object' && item !== null) {
          return this.frameworkSanitizeEmptyStringsToNull(item as Record<string, unknown>);
        }

        return item;
      }) as any;
    }

    return Object.fromEntries(
      Object.entries(obj).map(([key, value]) => {
        if (typeof value === 'string' && value.trim() === '') {
          return [key, null];
        }
        if (Array.isArray(value)) {
          return [key, this.frameworkSanitizeEmptyStringsToNull(value as any)];
        }
        if (typeof value === 'object' && value !== null) {
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
    const allowedNamespaces = [PAYLOAD_FIELD_PREFIX, SUBSCRIBER_DATA_FIELD_PREFIX, CONTEXT_FIELD_PREFIX];

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
}
