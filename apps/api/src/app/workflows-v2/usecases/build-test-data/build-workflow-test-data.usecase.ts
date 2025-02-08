import { Injectable } from '@nestjs/common';
import { ControlValuesRepository, NotificationStepEntity, NotificationTemplateEntity } from '@novu/dal';
import {
  ControlValuesLevelEnum,
  JSONSchemaDto,
  StepTypeEnum,
  UserSessionData,
  WorkflowTestDataResponseDto,
} from '@novu/shared';
import {
  GetWorkflowByIdsCommand,
  GetWorkflowByIdsUseCase,
  Instrument,
  InstrumentUsecase,
} from '@novu/application-generic';
import { WorkflowTestDataCommand } from './build-workflow-test-data.command';
import { parsePayloadSchema } from '../../shared/parse-payload-schema';
import { mockSchemaDefaults } from '../../util/utils';
import { ExtractVariables } from '../extract-variables/extract-variables.usecase';
import { ExtractVariablesCommand } from '../extract-variables/extract-variables.command';
import { buildVariablesSchema } from '../../util/create-schema';

@Injectable()
export class BuildWorkflowTestDataUseCase {
  constructor(
    private readonly getWorkflowByIdsUseCase: GetWorkflowByIdsUseCase,
    private readonly extractVariables: ExtractVariables
  ) {}

  @InstrumentUsecase()
  async execute(command: WorkflowTestDataCommand): Promise<WorkflowTestDataResponseDto> {
    const workflow = await this.fetchWorkflow(command);
    const toSchema = this.buildToFieldSchema({ user: command.user, steps: workflow.steps });
    const payloadSchema = await this.resolvePayloadSchema(workflow, command);
    const payloadSchemaMock = this.generatePayloadMock(payloadSchema);

    return {
      to: toSchema,
      payload: payloadSchemaMock,
    };
  }

  @Instrument()
  private async resolvePayloadSchema(
    workflow: NotificationTemplateEntity,
    command: WorkflowTestDataCommand
  ): Promise<JSONSchemaDto> {
    if (workflow.payloadSchema) {
      return parsePayloadSchema(workflow.payloadSchema, { safe: true }) || {};
    }

    const { payload } = await this.extractVariables.execute(
      ExtractVariablesCommand.create({
        environmentId: command.user.environmentId,
        organizationId: command.user.organizationId,
        userId: command.user._id,
        workflowId: workflow._id,
      })
    );

    return buildVariablesSchema(payload);
  }

  private generatePayloadMock(schema: JSONSchemaDto): Record<string, unknown> {
    if (!schema?.properties || Object.keys(schema.properties).length === 0) {
      return {};
    }

    return mockSchemaDefaults(schema);
  }

  @Instrument()
  private async fetchWorkflow(command: WorkflowTestDataCommand): Promise<NotificationTemplateEntity> {
    return this.getWorkflowByIdsUseCase.execute(
      GetWorkflowByIdsCommand.create({
        environmentId: command.user.environmentId,
        organizationId: command.user.organizationId,
        userId: command.user._id,
        workflowIdOrInternalId: command.workflowIdOrInternalId,
      })
    );
  }

  private buildToFieldSchema({
    user,
    steps,
  }: {
    user: UserSessionData;
    steps: NotificationStepEntity[];
  }): JSONSchemaDto {
    const hasEmailStep = this.hasStepType(steps, StepTypeEnum.EMAIL);
    const hasSmsStep = this.hasStepType(steps, StepTypeEnum.SMS);

    const properties: { [key: string]: JSONSchemaDto } = {
      subscriberId: { type: 'string', default: user._id },
    };

    const required: string[] = ['subscriberId'];

    if (hasEmailStep) {
      properties.email = { type: 'string', default: user.email ?? '', format: 'email' };
      required.push('email');
    }

    if (hasSmsStep) {
      properties.phone = { type: 'string', default: '' };
      required.push('phone');
    }

    return {
      type: 'object',
      properties,
      required,
      additionalProperties: false,
    } satisfies JSONSchemaDto;
  }

  private hasStepType(steps: NotificationStepEntity[], type: StepTypeEnum): boolean {
    return steps.some((step) => step.template?.type === type);
  }
}
