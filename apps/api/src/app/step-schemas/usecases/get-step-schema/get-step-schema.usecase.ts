import { BadRequestException, Injectable } from '@nestjs/common';

import { JsonSchema, Schema, StepType } from '@novu/framework';
import { NotificationStepEntity, NotificationTemplateRepository } from '@novu/dal';

import {
  GetStepTypeSchemaCommand,
  GetExistingStepSchemaCommand,
  GetStepSchemaCommand,
} from './get-step-schema.command';
import { StepSchemaDto } from '../../dtos/step-schema.dto';
import { mapStepTypeToOutput, mapStepTypeToResult } from '../../types';

@Injectable()
export class GetStepSchema {
  constructor(private readonly notificationTemplateRepository: NotificationTemplateRepository) {}

  async execute(command: GetStepSchemaCommand): Promise<StepSchemaDto> {
    if (isGetByStepType(command)) {
      return { controls: buildControlsSchema(command.stepType), variables: buildVariablesSchema() };
    }

    if (isGetByExistingStep(command)) {
      const { currentStep, previousSteps } = await this.findSteps(command);

      return {
        controls: buildControlsSchema(currentStep?.template?.type as StepType),
        variables: buildVariablesSchema(previousSteps),
      };
    }

    throw new BadRequestException('Invalid command');
  }

  private async findSteps(command: GetExistingStepSchemaCommand) {
    const workflow = await this.notificationTemplateRepository.findByIdQuery({
      id: command.workflowId,
      environmentId: command.environmentId,
    });

    if (!workflow) {
      throw new BadRequestException(`No workflow found with the given id ${command.workflowId}`);
    }

    const currentStep = workflow.steps.find((stepItem) => stepItem._id === command.stepId);

    if (!currentStep) {
      throw new BadRequestException(`No step found with the given id ${command.stepId}`);
    }

    const previousSteps = workflow.steps.slice(
      0,
      workflow.steps.findIndex((stepItem) => stepItem._id === command.stepId)
    );

    return { currentStep, previousSteps };
  }
}

const isGetByStepType = (command: GetStepSchemaCommand): command is GetStepTypeSchemaCommand =>
  (command as GetStepTypeSchemaCommand).stepType !== undefined;

const isGetByExistingStep = (command: GetStepSchemaCommand): command is GetExistingStepSchemaCommand =>
  (command as GetExistingStepSchemaCommand).stepId !== undefined &&
  (command as GetExistingStepSchemaCommand).workflowId !== undefined;

export const buildControlsSchema = (stepType: StepType): Schema => {
  return {
    ...mapStepTypeToOutput[stepType],
    description: 'Output of the step, including any controls defined in the Bridge App',
  };
};

const buildSubscriberSchema = () =>
  ({
    type: 'object',
    description: 'Schema representing the subscriber entity',
    properties: {
      firstName: { type: 'string', description: "Subscriber's first name" },
      lastName: { type: 'string', description: "Subscriber's last name" },
      email: { type: 'string', description: "Subscriber's email address" },
      phone: { type: 'string', description: "Subscriber's phone number (optional)" },
      avatar: { type: 'string', description: "URL to the subscriber's avatar image (optional)" },
      locale: { type: 'string', description: 'Locale for the subscriber (optional)' },
      subscriberId: { type: 'string', description: 'Unique identifier for the subscriber' },
      isOnline: { type: 'boolean', description: 'Indicates if the subscriber is online (optional)' },
      lastOnlineAt: {
        type: 'string',
        format: 'date-time',
        description: 'The last time the subscriber was online (optional)',
      },
    },
    required: ['firstName', 'lastName', 'email', 'subscriberId'],
    additionalProperties: false,
  }) as const satisfies Schema;

const buildPayloadSchema = () =>
  ({
    type: 'object',
    properties: {},
    required: [],
    additionalProperties: false,
    description:
      'Payload Schema - For Developers. Passed during the novu.trigger method, and controlled by the developer.',
  }) as const satisfies Schema;

const buildVariablesSchema = (previousSteps?: NotificationStepEntity[]): Schema => {
  return {
    type: 'object',
    description:
      // eslint-disable-next-line max-len
      'Variables that can be used with Liquid JS Template syntax. Includes subscriber attributes, payload variables, and supports liquid filters for formatting.',
    properties: {
      subscriber: buildSubscriberSchema(),
      payload: buildPayloadSchema(),
      steps: buildPreviousStepsSchema(previousSteps),
    },
    required: ['subscriber', 'payload'],
    additionalProperties: false,
  } as const satisfies Schema;
};

function buildPreviousStepsSchema(previousSteps: NotificationStepEntity[] | undefined) {
  type StepUUID = string;
  let previousStepsProperties: Record<StepUUID, JsonSchema> = {};

  if (previousSteps) {
    previousStepsProperties = previousSteps.reduce(
      (acc, step) => {
        if (step.template?._id) {
          acc[step.template._id] = mapStepTypeToResult[step.template.type as StepType];
        }

        return acc;
      },
      {} as Record<StepUUID, JsonSchema>
    );
  }

  const previousStepsSchema = {
    type: 'object',
    properties: previousStepsProperties,
    required: [],
    additionalProperties: false,
    description: 'Previous Steps Results',
  } as const satisfies Schema;

  return previousStepsSchema;
}
