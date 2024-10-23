import { BadRequestException, Injectable } from '@nestjs/common';
import { JSONSchema } from 'json-schema-to-ts';

import { type StepType } from '@novu/framework/internal';
import { NotificationStepEntity, NotificationTemplateRepository } from '@novu/dal';

import {
  GetExistingStepSchemaCommand,
  GetStepSchemaCommand,
  GetStepTypeSchemaCommand,
} from './get-step-schema.command';
import { StepSchemaDto } from '../../dtos/step-schema.dto';
import { mapStepTypeToOutput, mapStepTypeToResult } from '../../shared';
import { encodeBase62 } from '../../../shared/helpers';

@Injectable()
export class GetStepSchemaUseCase {
  constructor(private readonly notificationTemplateRepository: NotificationTemplateRepository) {}

  async execute(command: GetStepSchemaCommand): Promise<StepSchemaDto> {
    if (isGetByStepType(command)) {
      return { controls: buildControlsSchema({ stepType: command.stepType }), variables: buildVariablesSchema() };
    }

    if (isGetByStepId(command)) {
      const { currentStep, previousSteps } = await this.findSteps(command);

      return {
        controls: buildControlsSchema({ controlsSchema: currentStep.template?.controls?.schema }),
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
      throw new BadRequestException({
        message: 'No workflow found',
        workflowId: command.workflowId,
      });
    }

    const currentStep = workflow.steps.find((stepItem) => stepItem._id === command.stepId);

    if (!currentStep) {
      throw new BadRequestException({
        message: 'No step found',
        stepId: command.stepId,
        workflowId: command.workflowId,
      });
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

const isGetByStepId = (command: GetStepSchemaCommand): command is GetExistingStepSchemaCommand =>
  (command as GetExistingStepSchemaCommand).stepId !== undefined &&
  (command as GetExistingStepSchemaCommand).workflowId !== undefined;

export const buildControlsSchema = ({
  stepType,
  controlsSchema,
}: {
  stepType?: StepType;
  controlsSchema?: JSONSchema;
}): JSONSchema => {
  if (controlsSchema && typeof controlsSchema === 'object') {
    return {
      ...controlsSchema,
      description: 'Output of the step, including any controls defined in the Bridge App',
    };
  }

  if (stepType) {
    return {
      ...mapStepTypeToOutput[stepType],
      description: 'Output of the step, including any controls defined in the Bridge App',
    };
  }

  throw new Error('No controls schema found');
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
  }) as const satisfies JSONSchema;

const buildVariablesSchema = (previousSteps?: NotificationStepEntity[]): JSONSchema => {
  return {
    type: 'object',
    description:
      // eslint-disable-next-line max-len
      'Variables that can be used with Liquid JS Template syntax. Includes subscriber attributes, steps variables, and supports liquid filters for formatting.',
    properties: {
      subscriber: buildSubscriberSchema(),
      steps: buildPreviousStepsSchema(previousSteps),
    },
    required: ['subscriber'],
    additionalProperties: false,
  } as const satisfies JSONSchema;
};

function buildPreviousStepsSchema(previousSteps: NotificationStepEntity[] | undefined) {
  type StepUUID = string;
  let previousStepsProperties: Record<StepUUID, JSONSchema> = {};

  previousStepsProperties = (previousSteps || []).reduce(
    (acc, step) => {
      if (step.stepId && step.template?.type) {
        acc[step.stepId] = mapStepTypeToResult[step.template.type as StepType];
      }

      return acc;
    },
    {} as Record<StepUUID, JSONSchema>
  );

  return {
    type: 'object',
    properties: previousStepsProperties,
    required: [],
    additionalProperties: false,
    description: 'Previous Steps Results',
  } as const satisfies JSONSchema;
}
