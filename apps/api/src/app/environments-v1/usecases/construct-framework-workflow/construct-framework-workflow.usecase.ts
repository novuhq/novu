import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { workflow } from '@novu/framework/express';
import { ActionStep, ChannelStep, JsonSchema, Step, StepOptions, StepOutput, Workflow } from '@novu/framework/internal';
import { NotificationStepEntity, NotificationTemplateEntity, NotificationTemplateRepository } from '@novu/dal';
import { JSONSchemaDefinition, StepTypeEnum, WorkflowOriginEnum } from '@novu/shared';
import { Instrument, InstrumentUsecase, PinoLogger } from '@novu/application-generic';
import { AdditionalOperation, RulesLogic } from 'json-logic-js';
import _ from 'lodash';
import { ConstructFrameworkWorkflowCommand } from './construct-framework-workflow.command';
import {
  ChatOutputRendererUsecase,
  FullPayloadForRender,
  InAppOutputRendererUsecase,
  PushOutputRendererUsecase,
  EmailOutputRendererUsecase,
  SmsOutputRendererUsecase,
} from '../output-renderers';
import { DelayOutputRendererUsecase } from '../output-renderers/delay-output-renderer.usecase';
import { DigestOutputRendererUsecase } from '../output-renderers/digest-output-renderer.usecase';
import { evaluateRules } from '../../../shared/services/query-parser/query-parser.service';
import { isMatchingJsonSchema } from '../../../workflows-v2/util/jsonToSchema';

const LOG_CONTEXT = 'ConstructFrameworkWorkflow';

@Injectable()
export class ConstructFrameworkWorkflow {
  constructor(
    private logger: PinoLogger,
    private workflowsRepository: NotificationTemplateRepository,
    private inAppOutputRendererUseCase: InAppOutputRendererUsecase,
    private emailOutputRendererUseCase: EmailOutputRendererUsecase,
    private smsOutputRendererUseCase: SmsOutputRendererUsecase,
    private chatOutputRendererUseCase: ChatOutputRendererUsecase,
    private pushOutputRendererUseCase: PushOutputRendererUsecase,
    private delayOutputRendererUseCase: DelayOutputRendererUsecase,
    private digestOutputRendererUseCase: DigestOutputRendererUsecase
  ) {}

  @InstrumentUsecase()
  async execute(command: ConstructFrameworkWorkflowCommand): Promise<Workflow> {
    const dbWorkflow = await this.getDbWorkflow(command.environmentId, command.workflowId);
    if (command.controlValues) {
      for (const step of dbWorkflow.steps) {
        step.controlVariables = command.controlValues;
      }
    }

    return this.constructFrameworkWorkflow(dbWorkflow);
  }

  @Instrument()
  private constructFrameworkWorkflow(dbWorkflow: NotificationTemplateEntity): Workflow {
    return workflow(
      dbWorkflow.triggers[0].identifier,
      async ({ step, payload, subscriber }) => {
        const fullPayloadForRender: FullPayloadForRender = { payload, subscriber, steps: {} };
        for await (const staticStep of dbWorkflow.steps) {
          fullPayloadForRender.steps[staticStep.stepId || staticStep._templateId] = await this.constructStep(
            step,
            staticStep,
            fullPayloadForRender
          );
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

  @Instrument()
  private constructStep(
    step: Step,
    staticStep: NotificationStepEntity,
    fullPayloadForRender: FullPayloadForRender
  ): StepOutput<Record<string, unknown>> {
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
            return this.inAppOutputRendererUseCase.execute({ controlValues, fullPayloadForRender });
          },
          // Step options
          this.constructChannelStepOptions(staticStep, fullPayloadForRender)
        );
      case StepTypeEnum.EMAIL:
        return step.email(
          stepId,
          async (controlValues) => {
            return this.emailOutputRendererUseCase.execute({ controlValues, fullPayloadForRender });
          },
          this.constructChannelStepOptions(staticStep, fullPayloadForRender)
        );
      case StepTypeEnum.SMS:
        return step.sms(
          stepId,
          async (controlValues) => {
            return this.smsOutputRendererUseCase.execute({ controlValues, fullPayloadForRender });
          },
          this.constructChannelStepOptions(staticStep, fullPayloadForRender)
        );
      case StepTypeEnum.CHAT:
        return step.chat(
          stepId,
          async (controlValues) => {
            return this.chatOutputRendererUseCase.execute({ controlValues, fullPayloadForRender });
          },
          this.constructChannelStepOptions(staticStep, fullPayloadForRender)
        );
      case StepTypeEnum.PUSH:
        return step.push(
          stepId,
          async (controlValues) => {
            return this.pushOutputRendererUseCase.execute({ controlValues, fullPayloadForRender });
          },
          this.constructChannelStepOptions(staticStep, fullPayloadForRender)
        );
      case StepTypeEnum.DIGEST:
        return step.digest(
          stepId,
          async (controlValues) => {
            return this.digestOutputRendererUseCase.execute({ controlValues, fullPayloadForRender });
          },
          this.constructActionStepOptions(staticStep, fullPayloadForRender)
        );
      case StepTypeEnum.DELAY:
        return step.delay(
          stepId,
          async (controlValues) => {
            return this.delayOutputRendererUseCase.execute({ controlValues, fullPayloadForRender });
          },
          this.constructActionStepOptions(staticStep, fullPayloadForRender)
        );
      default:
        throw new InternalServerErrorException(`Step type ${stepType} is not supported`);
    }
  }

  @Instrument()
  private constructChannelStepOptions(
    staticStep: NotificationStepEntity,
    fullPayloadForRender: FullPayloadForRender
  ): Required<Parameters<ChannelStep>[2]> {
    return {
      ...this.constructCommonStepOptions(staticStep, fullPayloadForRender),
      // TODO: resolve this from the Step options
      disableOutputSanitization:
        (staticStep.controlVariables?.disableOutputSanitization as boolean | undefined) ?? false,
      // TODO: add providers
      providers: {},
    };
  }

  @Instrument()
  private constructActionStepOptions(
    staticStep: NotificationStepEntity,
    fullPayloadForRender: FullPayloadForRender
  ): Required<Parameters<ActionStep>[2]> {
    const stepOptions = this.constructCommonStepOptions(staticStep, fullPayloadForRender);

    let controlSchema = stepOptions.controlSchema as JSONSchemaDefinition;
    const stepType = staticStep.template!.type;

    /*
     * because of the known AJV issue with anyOf, we need to find the first schema that matches the control values
     * ref: https://ajv.js.org/guide/modifying-data.html#assigning-defaults
     */
    if (stepType === StepTypeEnum.DIGEST && typeof controlSchema === 'object' && controlSchema.anyOf) {
      const fistSchemaMatch = controlSchema.anyOf.find((item) => {
        return isMatchingJsonSchema(item, staticStep.controlVariables);
      });
      controlSchema = fistSchemaMatch ?? controlSchema.anyOf[0];
    }

    return {
      ...stepOptions,
      controlSchema: controlSchema as JsonSchema,
    };
  }

  @Instrument()
  private constructCommonStepOptions(
    staticStep: NotificationStepEntity,
    fullPayloadForRender: FullPayloadForRender
  ): Required<StepOptions> {
    return {
      // TODO: fix the `JSONSchemaDto` type to enforce a non-primitive schema type.
      controlSchema: staticStep.template!.controls!.schema as JsonSchema,
      skip: (controlValues: Record<string, unknown>) => this.processSkipOption(controlValues, fullPayloadForRender),
    };
  }

  @Instrument()
  private async getDbWorkflow(environmentId: string, workflowId: string): Promise<NotificationTemplateEntity> {
    const foundWorkflow = await this.workflowsRepository.findByTriggerIdentifier(environmentId, workflowId);

    if (!foundWorkflow) {
      throw new InternalServerErrorException(`Workflow ${workflowId} not found`);
    }

    return foundWorkflow;
  }

  private async processSkipOption(
    controlValues: { [x: string]: unknown },
    variables: FullPayloadForRender
  ): Promise<boolean> {
    const skipRules = controlValues.skip as RulesLogic<AdditionalOperation>;

    if (_.isEmpty(skipRules)) {
      return false;
    }

    const { result, error } = evaluateRules(skipRules, variables);

    if (error) {
      this.logger.error({ err: error }, 'Failed to evaluate skip rule', LOG_CONTEXT);
    }

    // The Step Conditions in the Dashboard control the step execution, that's why we need to invert the result.
    return !result;
  }
}

const PERMISSIVE_EMPTY_SCHEMA = {
  type: 'object',
  properties: {},
  required: [],
  additionalProperties: true,
} as const;
