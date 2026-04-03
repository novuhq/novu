import { Injectable } from '@nestjs/common';
import {
  getStepResolverControlSchema,
  InstrumentUsecase,
  isStepResolverSupportedType,
  ResourceValidatorService,
  stepTypeToControlSchema,
} from '@novu/application-generic';
import { ClientSession, MessageTemplateRepository } from '@novu/dal';
import {
  StepResolverSourceData,
  StepResolverTargetData,
  SyncStepResolverToEnvironmentCommand,
} from './sync-step-resolver-to-environment.command';

@Injectable()
export class SyncStepResolverToEnvironmentUsecase {
  constructor(
    private messageTemplateRepository: MessageTemplateRepository,
    private resourceValidatorService: ResourceValidatorService
  ) {}

  @InstrumentUsecase()
  async execute(command: SyncStepResolverToEnvironmentCommand): Promise<void> {
    const newResolverStepsOnTarget = this.countNewResolverAssignments(command);

    await this.resourceValidatorService.validateStepResolversLimit(
      command.targetEnvironmentId,
      command.user.organizationId,
      newResolverStepsOnTarget
    );

    const targetStepsByStepId = new Map(command.targetSteps.map((step) => [step.stepId, step]));

    const relevantSteps = command.sourceSteps.filter((sourceStep) => {
      const targetStep = targetStepsByStepId.get(sourceStep.stepId);
      if (!targetStep) {
        return false;
      }

      if (!isStepResolverSupportedType(sourceStep.stepType)) {
        return false;
      }

      return sourceStep.stepResolverHash != null || targetStep.stepResolverHash != null;
    });

    if (command.session) {
      for (const sourceStep of relevantSteps) {
        const targetStep = targetStepsByStepId.get(sourceStep.stepId);
        if (!targetStep) {
          continue;
        }

        if (sourceStep.stepResolverHash != null) {
          await this.promoteStepResolver(targetStep, command.targetEnvironmentId, sourceStep, command.session);
        } else {
          await this.clearStepResolver(targetStep, command.targetEnvironmentId, sourceStep, command.session);
        }
      }

      return;
    }

    await Promise.all(
      relevantSteps.map((sourceStep) => {
        const targetStep = targetStepsByStepId.get(sourceStep.stepId);
        if (!targetStep) {
          return Promise.resolve();
        }

        return sourceStep.stepResolverHash != null
          ? this.promoteStepResolver(targetStep, command.targetEnvironmentId, sourceStep)
          : this.clearStepResolver(targetStep, command.targetEnvironmentId, sourceStep);
      })
    );
  }

  private countNewResolverAssignments(command: SyncStepResolverToEnvironmentCommand): number {
    const targetStepsByStepId = new Map(command.targetSteps.map((step) => [step.stepId, step]));
    let count = 0;

    for (const sourceStep of command.sourceSteps) {
      if (sourceStep.stepResolverHash == null || sourceStep.stepResolverHash === '') {
        continue;
      }

      const targetStep = targetStepsByStepId.get(sourceStep.stepId);

      if (!targetStep) {
        continue;
      }

      const targetHasResolver = targetStep.stepResolverHash != null && targetStep.stepResolverHash !== '';

      if (!targetHasResolver) {
        count += 1;
      }
    }

    return count;
  }

  private async promoteStepResolver(
    targetStep: StepResolverTargetData,
    targetEnvironmentId: string,
    sourceStep: StepResolverSourceData,
    session?: ClientSession | null
  ): Promise<void> {
    await this.messageTemplateRepository.update(
      { _id: targetStep.templateId, _environmentId: targetEnvironmentId },
      {
        $set: {
          stepResolverHash: sourceStep.stepResolverHash,
          'controls.schema': getStepResolverControlSchema(sourceStep.controlSchema),
        },
        $unset: { 'controls.uiSchema': 1 },
      },
      { session }
    );
  }

  private async clearStepResolver(
    targetStep: StepResolverTargetData,
    targetEnvironmentId: string,
    sourceStep: StepResolverSourceData,
    session?: ClientSession | null
  ): Promise<void> {
    const controlSchema = sourceStep.controlSchema ?? stepTypeToControlSchema[sourceStep.stepType]?.schema;

    await this.messageTemplateRepository.update(
      { _id: targetStep.templateId, _environmentId: targetEnvironmentId },
      {
        $unset: {
          stepResolverHash: 1,
        },
        $set: {
          'controls.schema': controlSchema,
          'controls.uiSchema': stepTypeToControlSchema[sourceStep.stepType]?.uiSchema,
        },
      },
      { session }
    );
  }
}
