import { Injectable, NotFoundException } from '@nestjs/common';
import {
  ActionStep,
  ChannelStep,
  ChatOutput,
  DelayOutput,
  DigestOutput,
  EmailOutput,
  InAppOutput,
  PushOutput,
  SmsOutput,
  Step,
  StepOptions,
  StepOutput,
  Workflow,
  workflow,
} from '@novu/framework';
import { NotificationTemplateRepository, NotificationTemplateEntity, NotificationStepEntity } from '@novu/dal';
import { StepTypeEnum } from '@novu/shared';
import { ConstructFrameworkWorkflowCommand } from './construct-framework-workflow.command';

@Injectable()
export class ConstructFrameworkWorkflow {
  constructor(private workflowsRepository: NotificationTemplateRepository) {}

  async execute(command: ConstructFrameworkWorkflowCommand): Promise<Workflow> {
    const dbWorkflow = await this.getDbWorkflow(command.environmentId, command.workflowId);

    return this.constructFrameworkWorkflow(dbWorkflow);
  }

  private async getDbWorkflow(environmentId: string, workflowId: string): Promise<NotificationTemplateEntity> {
    const foundWorkflow = await this.workflowsRepository.findByTriggerIdentifier(environmentId, workflowId);

    if (!foundWorkflow) {
      throw new NotFoundException(`Workflow ${workflowId} not found`);
    }

    return foundWorkflow;
  }

  private constructFrameworkWorkflow(newWorkflow: NotificationTemplateEntity): Workflow {
    return workflow(
      newWorkflow.name,
      async ({ step }) => {
        for await (const staticStep of newWorkflow.steps) {
          await this.constructStep(step, staticStep);
        }
      },
      {
        /*
         * TODO: Workflow options are not needed currently, given that this endpoint
         * focuses on execution only. However we should reconsider if we decide to
         * expose Workflow options to the `workflow` function.
         *
         * preferences: foundWorkflow.preferences,
         * tags: foundWorkflow.tags,
         */
      }
    );
  }

  private constructStep(step: Step, staticStep: NotificationStepEntity): StepOutput<Record<string, unknown>> {
    const stepTemplate = staticStep.template;

    if (!stepTemplate) {
      throw new NotFoundException(`Step template not found for step ${staticStep.stepId}`);
    }

    const stepType = stepTemplate.type;
    const { stepId } = staticStep;

    if (!stepId) {
      throw new NotFoundException(`Step id not found for step ${staticStep.stepId}`);
    }

    const stepControls = stepTemplate.controls;

    if (!stepControls) {
      throw new NotFoundException(`Step controls not found for step ${staticStep.stepId}`);
    }

    switch (stepType) {
      case StepTypeEnum.IN_APP:
        return step.inApp(
          // The step id is used internally by the framework to identify the step
          stepId,
          // The step callback function. Takes controls and returns the step outputs
          async (controlValues) => {
            // TODO: insert custom in-app hydration logic here.
            return controlValues as InAppOutput;
          },
          // Step options
          this.constructChannelStepOptions(staticStep)
        );
      case StepTypeEnum.EMAIL:
        return step.email(
          stepId,
          async (controlValues) => {
            // TODO: insert custom Maily.to hydration logic here.
            return controlValues as EmailOutput;
          },
          this.constructChannelStepOptions(staticStep)
        );
      case StepTypeEnum.SMS:
        return step.inApp(
          stepId,
          async (controlValues) => {
            // TODO: insert custom SMS hydration logic here.
            return controlValues as SmsOutput;
          },
          this.constructChannelStepOptions(staticStep)
        );
      case StepTypeEnum.CHAT:
        return step.inApp(
          stepId,
          async (controlValues) => {
            // TODO: insert custom chat hydration logic here.
            return controlValues as ChatOutput;
          },
          this.constructChannelStepOptions(staticStep)
        );
      case StepTypeEnum.PUSH:
        return step.inApp(
          stepId,
          async (controlValues) => {
            // TODO: insert custom push hydration logic here.
            return controlValues as PushOutput;
          },
          this.constructChannelStepOptions(staticStep)
        );
      case StepTypeEnum.DIGEST:
        return step.digest(
          stepId,
          async (controlValues) => {
            return controlValues as DigestOutput;
          },
          this.constructActionStepOptions(staticStep)
        );
      case StepTypeEnum.DELAY:
        return step.delay(
          stepId,
          async (controlValues) => {
            return controlValues as DelayOutput;
          },
          this.constructActionStepOptions(staticStep)
        );
      default:
        throw new NotFoundException(`Step type ${stepType} not found`);
    }
  }

  private constructChannelStepOptions(staticStep: NotificationStepEntity): Required<Parameters<ChannelStep>[2]> {
    return {
      ...this.constructCommonStepOptions(staticStep),
      // TODO: resolve this from the Step options
      disableOutputSanitization: false,
      // TODO: add providers
      providers: {},
    };
  }

  private constructActionStepOptions(staticStep: NotificationStepEntity): Required<Parameters<ActionStep>[2]> {
    return {
      ...this.constructCommonStepOptions(staticStep),
    };
  }

  private constructCommonStepOptions(staticStep: NotificationStepEntity): Required<StepOptions> {
    return {
      /** @deprecated */
      inputSchema: staticStep.template!.controls!.schema,
      controlSchema: staticStep.template!.controls!.schema,
      /*
       * TODO: add conditions
       * Used to construct conditions defined with https://react-querybuilder.js.org/ or similar
       */
      skip: (controlValues) => false,
    };
  }
}
