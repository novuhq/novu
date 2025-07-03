import { Injectable, Optional } from '@nestjs/common';
import { UserSessionData, WebhookObjectTypeEnum, WebhookEventEnum, WorkflowStatusEnum } from '@novu/shared';
import { NotificationTemplateEntity, NotificationTemplateRepository } from '@novu/dal';
import { SendWebhookMessage } from '@novu/application-generic';
import { PatchWorkflowCommand } from './patch-workflow.command';
import { GetWorkflowUseCase } from '../get-workflow';
import { WorkflowResponseDto } from '../../dtos';
import { BuildStepIssuesUsecase } from '../build-step-issues/build-step-issues.usecase';
import { stepTypeToControlSchema } from '../../shared';
import { GetWorkflowWithPreferencesUseCase } from '../../../workflows-v1/usecases/get-workflow-with-preferences/get-workflow-with-preferences.usecase';
import { WorkflowWithPreferencesResponseDto } from '../../../workflows-v1/dtos/get-workflow-with-preferences.dto';

@Injectable()
export class PatchWorkflowUsecase {
  constructor(
    private getWorkflowWithPreferencesUseCase: GetWorkflowWithPreferencesUseCase,
    private notificationTemplateRepository: NotificationTemplateRepository,
    private getWorkflowUseCase: GetWorkflowUseCase,
    private buildStepIssuesUsecase: BuildStepIssuesUsecase,
    @Optional()
    private sendWebhookMessage?: SendWebhookMessage
  ) {}

  async execute(command: PatchWorkflowCommand): Promise<WorkflowResponseDto> {
    const persistedWorkflow = await this.fetchWorkflow(command);
    const transientWorkflow = this.patchWorkflowFields(persistedWorkflow, command);

    const hasPayloadSchemaChanged = this.hasPayloadSchemaChanged(persistedWorkflow, command);

    if (hasPayloadSchemaChanged) {
      await this.recalculateStepIssues(transientWorkflow, command.user);
    }

    await this.persistWorkflow(transientWorkflow, command.user);

    const updatedWorkflow = await this.getWorkflowUseCase.execute({
      workflowIdOrInternalId: command.workflowIdOrInternalId,
      user: command.user,
    });

    if (this.sendWebhookMessage) {
      await this.sendWebhookMessage.execute({
        eventType: WebhookEventEnum.WORKFLOW_UPDATED,
        objectType: WebhookObjectTypeEnum.WORKFLOW,
        payload: {
          object: updatedWorkflow as unknown as Record<string, unknown>,
          previousObject: persistedWorkflow as unknown as Record<string, unknown>,
        },
        organizationId: command.user.organizationId,
        environmentId: command.user.environmentId,
      });
    }

    return updatedWorkflow;
  }

  private hasPayloadSchemaChanged(
    persistedWorkflow: NotificationTemplateEntity,
    command: PatchWorkflowCommand
  ): boolean {
    return (
      command.payloadSchema !== undefined &&
      command.payloadSchema !== null &&
      JSON.stringify(persistedWorkflow.payloadSchema) !== JSON.stringify(command.payloadSchema)
    );
  }

  private async recalculateStepIssues(
    workflow: NotificationTemplateEntity,
    userSessionData: UserSessionData
  ): Promise<void> {
    for (const step of workflow.steps) {
      if (!step._templateId || !step.template?.type) continue;

      const controlSchemas = step.template?.controls || stepTypeToControlSchema[step.template.type];

      const stepIssues = await this.buildStepIssuesUsecase.execute({
        workflowOrigin: workflow.origin!,
        user: userSessionData,
        stepInternalId: step._templateId,
        workflow,
        controlSchema: controlSchemas.schema,
        stepType: step.template.type,
      });

      step.issues = stepIssues;
    }
  }

  private patchWorkflowFields(
    persistedWorkflow: NotificationTemplateEntity,
    command: PatchWorkflowCommand
  ): NotificationTemplateEntity {
    const transientWorkflow = { ...persistedWorkflow };
    if (command.active !== undefined && command.active !== null) {
      transientWorkflow.active = command.active;
    }

    if (command.payloadSchema !== undefined && command.payloadSchema !== null) {
      transientWorkflow.payloadSchema = command.payloadSchema;
    }

    if (command.validatePayload !== undefined && command.validatePayload !== null) {
      transientWorkflow.validatePayload = command.validatePayload;
    }

    if (command.name !== undefined && command.name !== null) {
      transientWorkflow.name = command.name;
    }

    if (command.description !== undefined && command.description !== null) {
      transientWorkflow.description = command.description;
    }

    if (command.tags !== undefined && command.tags !== null) {
      transientWorkflow.tags = command.tags;
    }

    if (command.active !== undefined && command.active !== null) {
      transientWorkflow.status = command.active ? WorkflowStatusEnum.ACTIVE : WorkflowStatusEnum.INACTIVE;
    }

    return transientWorkflow;
  }

  private async persistWorkflow(workflowWithIssues: NotificationTemplateEntity, userSessionData: UserSessionData) {
    await this.notificationTemplateRepository.update(
      {
        _id: workflowWithIssues._id,
        _environmentId: userSessionData.environmentId,
      },
      {
        ...workflowWithIssues,
      }
    );
  }

  private async fetchWorkflow(command: PatchWorkflowCommand): Promise<WorkflowWithPreferencesResponseDto> {
    return await this.getWorkflowWithPreferencesUseCase.execute({
      workflowIdOrInternalId: command.workflowIdOrInternalId,
      environmentId: command.user.environmentId,
      organizationId: command.user.organizationId,
    });
  }
}
