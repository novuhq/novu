import { Injectable } from '@nestjs/common';
import { InstrumentUsecase } from '@novu/application-generic';
import { NotificationTemplateRepository } from '@novu/dal';
import type { JSONSchemaDto } from '@novu/shared';
import type { WorkflowPayloadSchemasResponseDto } from '../../dtos';
import type { GetWorkflowPayloadSchemasCommand } from './get-workflow-payload-schemas.command';

@Injectable()
export class GetWorkflowPayloadSchemasUseCase {
  constructor(private notificationTemplateRepository: NotificationTemplateRepository) {}

  @InstrumentUsecase()
  async execute(command: GetWorkflowPayloadSchemasCommand): Promise<WorkflowPayloadSchemasResponseDto> {
    const workflows = await this.notificationTemplateRepository.find(
      {
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      },
      'payloadSchema'
    );
    const payloadSchemas = workflows
      .map((workflow) => workflow.payloadSchema)
      .filter((schema): schema is JSONSchemaDto => schema !== null && typeof schema === 'object');

    return { payloadSchemas };
  }
}
