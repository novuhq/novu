import { Injectable } from '@nestjs/common';
import {
  ControlValuesRepository,
  JsonSchemaFormatEnum,
  JsonSchemaTypeEnum,
  NotificationStepEntity,
  NotificationTemplateEntity,
} from '@novu/dal';
import { ControlValuesLevelEnum, StepTypeEnum, UserSessionData } from '@novu/shared';
import {
  GetWorkflowByIdsCommand,
  GetWorkflowByIdsUseCase,
  Instrument,
  InstrumentUsecase,
} from '@novu/application-generic';
import { WorkflowTestDataCommand } from './build-workflow-test-data.command';
import { parsePayloadSchema } from '../../shared/parse-payload-schema';
import { mockSchemaDefaults } from '../../util/utils';
import { CreateVariablesObject } from '../../../shared/usecases/create-variables-object/create-variables-object.usecase';
import { CreateVariablesObjectCommand } from '../../../shared/usecases/create-variables-object/create-variables-object.command';
import { buildVariablesSchema } from '../../../shared/utils/create-schema';
import { WorkflowTestDataResponseDto } from '../../dtos';
import { JSONSchemaDto } from '../../../shared/dtos/json-schema.dto';

@Injectable()
export class BuildWorkflowTestDataUseCase {
  constructor(
    private readonly getWorkflowByIdsUseCase: GetWorkflowByIdsUseCase,
    private readonly createVariablesObject: CreateVariablesObject,
    private readonly controlValuesRepository: ControlValuesRepository
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

    const controls = await this.controlValuesRepository.find(
      {
        _environmentId: command.user.environmentId,
        _organizationId: command.user.organizationId,
        _workflowId: workflow._id,
        level: ControlValuesLevelEnum.STEP_CONTROLS,
        controls: { $ne: null },
      },
      {
        controls: 1,
        _id: 0,
      }
    );

    const allControlValuesFlat = controls
      .map((item) => item.controls)
      .flat()
      .flatMap((obj) => Object.values(obj));

    const { payload } = await this.createVariablesObject.execute(
      CreateVariablesObjectCommand.create({
        environmentId: command.user.environmentId,
        organizationId: command.user.organizationId,
        controlValues: allControlValuesFlat,
      })
    );

    return buildVariablesSchema(payload);
  }

  private generatePayloadMock(schema: JSONSchemaDto): JSONSchemaDto {
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
      subscriberId: { type: JsonSchemaTypeEnum.STRING, default: user._id },
    };

    const required: string[] = ['subscriberId'];

    if (hasEmailStep) {
      properties.email = {
        type: JsonSchemaTypeEnum.STRING,
        default: user.email ?? '',
        format: JsonSchemaFormatEnum.EMAIL,
      };
      required.push('email');
    }

    if (hasSmsStep) {
      properties.phone = { type: JsonSchemaTypeEnum.STRING, default: '' };
      required.push('phone');
    }

    return {
      type: JsonSchemaTypeEnum.OBJECT,
      properties,
      required,
      additionalProperties: false,
    } satisfies JSONSchemaDto;
  }

  private hasStepType(steps: NotificationStepEntity[], type: StepTypeEnum): boolean {
    return steps.some((step) => step.template?.type === type);
  }
}
