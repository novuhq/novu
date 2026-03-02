import { Injectable } from '@nestjs/common';
import { InstrumentUsecase } from '@novu/application-generic';
import { MessageTemplateRepository } from '@novu/dal';
import {
  StepResolverSourceData,
  StepResolverTargetData,
  SyncStepResolverToEnvironmentCommand,
} from './sync-step-resolver-to-environment.command';

@Injectable()
export class SyncStepResolverToEnvironmentUsecase {
  constructor(private messageTemplateRepository: MessageTemplateRepository) {}

  @InstrumentUsecase()
  async execute(command: SyncStepResolverToEnvironmentCommand): Promise<void> {
    if (command.sourceSteps.length === 0) return;

    await Promise.all(
      command.sourceSteps.map((sourceStep) =>
        this.syncStepResolverData(sourceStep, command.targetSteps, command.targetEnvironmentId)
      )
    );
  }

  private async syncStepResolverData(
    sourceStep: StepResolverSourceData,
    targetSteps: StepResolverTargetData[],
    targetEnvironmentId: string
  ): Promise<void> {
    const targetStep = targetSteps.find((t) => t.stepId === sourceStep.stepId);

    if (!targetStep) return;

    if (sourceStep.stepResolverHash == null) {
      await this.messageTemplateRepository.update(
        { _id: targetStep.templateId, _environmentId: targetEnvironmentId },
        { $unset: { stepResolverHash: '', 'controls.schema': '' } }
      );

      return;
    }

    if (sourceStep.controlSchema != null) {
      await this.messageTemplateRepository.update(
        { _id: targetStep.templateId, _environmentId: targetEnvironmentId },
        { $set: { stepResolverHash: sourceStep.stepResolverHash, 'controls.schema': sourceStep.controlSchema } }
      );
    } else {
      await this.messageTemplateRepository.update(
        { _id: targetStep.templateId, _environmentId: targetEnvironmentId },
        { $set: { stepResolverHash: sourceStep.stepResolverHash }, $unset: { 'controls.schema': '' } }
      );
    }
  }
}
