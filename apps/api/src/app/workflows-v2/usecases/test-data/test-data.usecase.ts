import { JSONSchema } from 'json-schema-to-ts';
import { Injectable } from '@nestjs/common';
import { NotificationTemplateEntity } from '@novu/dal';
import { UserSessionData, WorkflowTestDataResponseDto } from '@novu/shared';

import { WorkflowTestDataCommand } from './test-data.command';
import { GetWorkflowByIdsUseCase } from '../get-workflow-by-ids/get-workflow-by-ids.usecase';
import { GetWorkflowByIdsCommand } from '../get-workflow-by-ids/get-workflow-by-ids.command';

const buildToFieldSchema = ({ user }: { user: UserSessionData }) =>
  ({
    type: 'object',
    properties: {
      subscriberId: { type: 'string', default: user._id },
      /*
       * TODO: the email and phone fields should be dynamic based on the workflow steps
       * if the workflow has has an email step, then email is required etc
       */
      email: { type: 'string', default: user.email ?? '', format: 'email' },
      phone: { type: 'string', default: '' },
    },
    required: ['subscriberId', 'email', 'phone'],
    additionalProperties: false,
  }) as const satisfies JSONSchema;

const buildPayloadSchema = () =>
  ({
    type: 'object',
    description: 'Schema representing the workflow payload',
    properties: {
      /*
       * TODO: the properties should be dynamic based on the workflow variables
       */
      example: { type: 'string', description: 'Example field', default: 'payload.example' },
    },
    required: ['subscriberId', 'email', 'phone'],
    additionalProperties: false,
  }) as const satisfies JSONSchema;

@Injectable()
export class WorkflowTestDataUseCase {
  constructor(private getWorkflowByIdsUseCase: GetWorkflowByIdsUseCase) {}

  async execute(command: WorkflowTestDataCommand): Promise<WorkflowTestDataResponseDto> {
    const _workflowEntity: NotificationTemplateEntity | null = await this.getWorkflowByIdsUseCase.execute(
      GetWorkflowByIdsCommand.create({
        ...command,
        identifierOrInternalId: command.identifierOrInternalId,
      })
    );

    return {
      to: buildToFieldSchema({ user: command.user }),
      payload: buildPayloadSchema(),
    };
  }
}
