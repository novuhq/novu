import { Injectable, NotFoundException } from '@nestjs/common';
import { InstrumentUsecase, PinoLogger } from '@novu/application-generic';
import {
  ControlValuesEntity,
  ControlValuesRepository,
  EnvironmentVariableRepository,
  NotificationTemplateEntity,
  NotificationTemplateRepository,
} from '@novu/dal';
import { ControlValuesLevelEnum } from '@novu/shared';
import {
  EnvironmentVariableWorkflowInfoDto,
  GetEnvironmentVariableUsageResponseDto,
} from '../../dtos/get-environment-variable-usage-response.dto';
import { GetEnvironmentVariableUsageCommand } from './get-environment-variable-usage.command';

const CONTROL_VALUES_SELECT = ['_workflowId', '_environmentId', 'controls'] as const;
type ControlValuesUsageFetchResult = Pick<ControlValuesEntity, (typeof CONTROL_VALUES_SELECT)[number]>;

@Injectable()
export class GetEnvironmentVariableUsage {
  constructor(
    private environmentVariableRepository: EnvironmentVariableRepository,
    private controlValuesRepository: ControlValuesRepository,
    private notificationTemplateRepository: NotificationTemplateRepository,
    private logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  @InstrumentUsecase()
  async execute(command: GetEnvironmentVariableUsageCommand): Promise<GetEnvironmentVariableUsageResponseDto> {
    const variable = await this.environmentVariableRepository.findOne(
      { key: command.variableKey, _organizationId: command.organizationId },
      ['key']
    );

    if (!variable) {
      throw new NotFoundException(`Environment variable with key "${command.variableKey}" not found`);
    }

    const envVarPattern = `env.${variable.key}`;
    const controlValues: ControlValuesUsageFetchResult[] = await this.controlValuesRepository.find(
      {
        _organizationId: command.organizationId,
        level: ControlValuesLevelEnum.STEP_CONTROLS,
      },
      CONTROL_VALUES_SELECT.join(' ')
    );

    const referencingControlValues = controlValues.filter((cv) =>
      this.controlsReferenceEnvVar(cv.controls, envVarPattern)
    );

    const uniqueWorkflowIds = [
      ...new Set(referencingControlValues.filter((cv) => cv._workflowId).map((cv) => cv._workflowId as string)),
    ];

    if (uniqueWorkflowIds.length === 0) {
      return { workflows: [] };
    }

    let fetchedWorkflows: Pick<NotificationTemplateEntity, 'name' | 'triggers' | '_environmentId'>[];

    try {
      fetchedWorkflows = await this.notificationTemplateRepository.findNameAndTriggersByIds(
        command.organizationId,
        uniqueWorkflowIds
      );
    } catch (error) {
      this.logger.error({ err: error }, 'Failed to fetch workflows for environment variable usage');

      throw error;
    }

    const workflows: EnvironmentVariableWorkflowInfoDto[] = fetchedWorkflows
      .filter((workflow) => workflow?.triggers?.length > 0)
      .map((workflow) => ({
        name: workflow.name,
        workflowId: workflow.triggers[0].identifier,
      }));

    return { workflows };
  }

  /**
   * Matches both Liquid syntax ({{env.KEY}}) and Maily JSON node attributes ("id": "env.KEY"),
   * so a bare `env.KEY` search covers all control value storage formats without false negatives.
   * Uses token-boundary regex to avoid false positives on similarly prefixed keys (e.g. env.KEY vs env.KEY_EXTRA).
   */
  private controlsReferenceEnvVar(controls: ControlValuesUsageFetchResult['controls'], envVarPattern: string): boolean {
    const escaped = envVarPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const boundaryRegex = new RegExp(`(^|[^\\w$])${escaped}(?![\\w$])`);

    return boundaryRegex.test(JSON.stringify(controls));
  }
}
