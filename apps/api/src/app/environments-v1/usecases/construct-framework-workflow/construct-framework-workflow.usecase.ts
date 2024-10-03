import { Injectable, InternalServerErrorException } from '@nestjs/common';
import {
  ActionStep,
  ChannelStep,
  DelayOutput,
  DigestOutput,
  Step,
  StepOptions,
  StepOutput,
  Workflow,
  workflow,
} from '@novu/framework';
import { NotificationStepEntity, NotificationTemplateEntity, NotificationTemplateRepository } from '@novu/dal';
import { StepTypeEnum } from '@novu/shared';
import { ConstructFrameworkWorkflowCommand } from './construct-framework-workflow.command';
import {
  ChatOutputRendererUsecase,
  EmailOutputRendererUsecase,
  InAppOutputRendererUsecase,
  PushOutputRendererUsecase,
  SmsOutputRendererUsecase,
} from '../output-renderers';

@Injectable()
export class ConstructFrameworkWorkflow {
  constructor(
    private workflowsRepository: NotificationTemplateRepository,
    private inAppOutputRendererUseCase: InAppOutputRendererUsecase,
    private emailOutputRendererUseCase: EmailOutputRendererUsecase,
    private smsOutputRendererUseCase: SmsOutputRendererUsecase,
    private chatOutputRendererUseCase: ChatOutputRendererUsecase,
    private pushOutputRendererUseCase: PushOutputRendererUsecase
  ) {}

  async execute(command: ConstructFrameworkWorkflowCommand): Promise<Workflow> {
    const dbWorkflow = await this.getDbWorkflow(command.environmentId, command.workflowId);
    if (command.controlValues) {
      for (const step of dbWorkflow.steps) {
        step.controlVariables = command.controlValues;
      }
    }

    return this.constructFrameworkWorkflow(dbWorkflow);
  }

  private constructFrameworkWorkflow(newWorkflow: NotificationTemplateEntity): Workflow {
    return workflow(
      newWorkflow.triggers[0].identifier,
      async ({ step }) => {
        for await (const staticStep of newWorkflow.steps) {
          await this.constructStep(step, staticStep);
        }
      },
      {
        payloadSchema: PERMISSIVE_EMPTY_SCHEMA,

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
      throw new InternalServerErrorException(`Step template not found for step ${staticStep.stepId}`);
    }

    const stepType = stepTemplate.type;
    const { stepId } = staticStep;
    if (!stepId) {
      throw new InternalServerErrorException(`Step id not found for step ${staticStep.stepId}`);
    }
    const stepControls = stepTemplate.controls;

    if (!stepControls) {
      throw new InternalServerErrorException(`Step controls not found for step ${staticStep.stepId}`);
    }

    switch (stepType) {
      case StepTypeEnum.IN_APP:
        return step.inApp(
          // The step id is used internally by the framework to identify the step
          stepId,
          // The step callback function. Takes controls and returns the step outputs
          async (controlValues) => {
            return this.inAppOutputRendererUseCase.execute({ controlValues });
          },
          // Step options
          this.constructChannelStepOptions(staticStep)
        );
      case StepTypeEnum.EMAIL:
        return step.email(
          stepId,
          async (controlValues) => {
            return this.emailOutputRendererUseCase.execute({ controlValues });
          },
          this.constructChannelStepOptions(staticStep)
        );
      case StepTypeEnum.SMS:
        return step.inApp(
          stepId,
          async (controlValues) => {
            return this.smsOutputRendererUseCase.execute({ controlValues });
          },
          this.constructChannelStepOptions(staticStep)
        );
      case StepTypeEnum.CHAT:
        return step.inApp(
          stepId,
          async (controlValues) => {
            return this.chatOutputRendererUseCase.execute({ controlValues });
          },
          this.constructChannelStepOptions(staticStep)
        );
      case StepTypeEnum.PUSH:
        return step.inApp(
          stepId,
          async (controlValues) => {
            return this.pushOutputRendererUseCase.execute({ controlValues });
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
        throw new InternalServerErrorException(`Step type ${stepType} is not supported`);
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
  private async getDbWorkflow(environmentId: string, workflowId: string): Promise<NotificationTemplateEntity> {
    const foundWorkflow = await this.workflowsRepository.findByTriggerIdentifier(environmentId, workflowId);

    if (!foundWorkflow) {
      throw new InternalServerErrorException(`Workflow ${workflowId} not found`);
    }

    return foundWorkflow;
  }
}
const PERMISSIVE_EMPTY_SCHEMA = {
  type: 'object',
  properties: {},
  required: [],
  additionalProperties: true,
} as const;
