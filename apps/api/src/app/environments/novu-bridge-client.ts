import { Injectable, Inject, NotFoundException, Query, Scope } from '@nestjs/common';
import type { Request, Response } from 'express';

import {
  Client,
  GetActionEnum,
  NovuRequestHandler,
  Step,
  Workflow,
  workflow,
  WorkflowChannelEnum,
} from '@novu/framework';
import { NovuHandler } from '@novu/framework/nest';
import { EnvironmentRepository, NotificationTemplateEntity, NotificationTemplateRepository } from '@novu/dal';
import { StepTypeEnum } from '@novu/shared';
import { decryptApiKey } from '@novu/application-generic';
import { REQUEST } from '@nestjs/core';

export const frameworkName = 'novu-nest';

// Unfortunately we need this mapper because the `in_app` step type uses `step.inApp()` in Framework.
const stepFnFromStepType: Record<Exclude<StepTypeEnum, StepTypeEnum.CUSTOM | StepTypeEnum.TRIGGER>, keyof Step> = {
  [StepTypeEnum.IN_APP]: WorkflowChannelEnum.IN_APP,
  [StepTypeEnum.EMAIL]: WorkflowChannelEnum.EMAIL,
  [StepTypeEnum.SMS]: WorkflowChannelEnum.SMS,
  [StepTypeEnum.CHAT]: WorkflowChannelEnum.CHAT,
  [StepTypeEnum.PUSH]: WorkflowChannelEnum.PUSH,
  [StepTypeEnum.DIGEST]: StepTypeEnum.DIGEST,
  [StepTypeEnum.DELAY]: StepTypeEnum.DELAY,
};

@Injectable({ scope: Scope.REQUEST })
export class NovuBridgeClient {
  public novuRequestHandler: NovuRequestHandler | null = null;

  constructor(
    @Inject(NovuHandler) private novuHandler: NovuHandler,
    private environmentsRepository: EnvironmentRepository,
    private workflowsRepository: NotificationTemplateRepository
  ) {}

  public async handleRequest(req: Request, res: Response) {
    const secretKey = await this.getSecretKey(req.params.environmentId);

    const workflows: Workflow[] = [];

    console.log({ reqQuery: req.query });
    console.log({ reqBody: req.body });
    console.log({ reqParams: req.params });
    if (!Object.values(GetActionEnum).includes(req.query.action as GetActionEnum)) {
      const foundWorkflow = await this.getWorkflow(req.params.environmentId, req.query.workflowId as string);

      const programmaticallyCreatedWorkflow = this.createWorkflow(foundWorkflow, req.body.controls);

      workflows.push(programmaticallyCreatedWorkflow);
    }

    this.novuRequestHandler = new NovuRequestHandler({
      frameworkName,
      workflows,
      client: new Client({ secretKey, strictAuthentication: true }),
      handler: this.novuHandler.handler,
    });
    await this.novuRequestHandler.createHandler()(req, res);
  }

  // TODO: wrap the secret key fetching per environmentId in a usecase, including the decryption, add caching.
  private async getSecretKey(environmentId: string): Promise<string> {
    const environment = await this.environmentsRepository.findOne({ _id: environmentId });
    if (!environment) {
      throw new NotFoundException('Environment not found');
    }
    const secretKey = decryptApiKey(environment.apiKeys[0].key);

    return secretKey;
  }

  private async getWorkflow(environmentId: string, workflowId: string): Promise<NotificationTemplateEntity> {
    const foundWorkflow = await this.workflowsRepository.findByTriggerIdentifier(environmentId, workflowId);

    if (!foundWorkflow) {
      throw new NotFoundException('Workflow not found');
    }

    return foundWorkflow;
  }

  private createWorkflow(newWorkflow: NotificationTemplateEntity, controls: Record<string, unknown>): Workflow {
    return workflow(
      newWorkflow.name,
      async ({ step }) => {
        for await (const staticStep of newWorkflow.steps) {
          const stepTemplate = staticStep.template;

          if (!stepTemplate) {
            throw new NotFoundException('Step template not found');
          }

          const stepType = stepTemplate.type;
          const stepFn = stepFnFromStepType[stepType];
          const stepControls = stepTemplate.controls;

          if (!stepControls) {
            throw new NotFoundException('Step controls not found');
          }

          await step[stepFn](staticStep.stepId, () => controls, {
            controlSchema: stepControls.schema,
            /*
             * TODO: add conditions
             * Used to construct conditions defined with https://react-querybuilder.js.org/ or similar
             */
            skip: () => false,
          });
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
}
