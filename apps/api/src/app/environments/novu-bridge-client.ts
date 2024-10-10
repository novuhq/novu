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
  [StepTypeEnum.DIGEST]: 'digest',
  [StepTypeEnum.DELAY]: 'delay',
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

  // TODO: refactor this into a usecase, add caching.
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
          const stepType = staticStep.template!.type;
          const stepFn = stepFnFromStepType[stepType];

          await step[stepFn](staticStep.stepId, () => controls, {
            // TODO: fix the step typings, `controls` lives on template property, not step
            controlSchema: (staticStep.template as unknown as typeof staticStep).controls?.schema,
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
