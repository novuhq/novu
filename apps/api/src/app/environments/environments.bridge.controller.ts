import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Get,
  NotFoundException,
  Options,
  Param,
  Post,
  Query,
  Req,
  Res,
  UseInterceptors,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { StepTypeEnum, WorkflowTypeEnum } from '@novu/shared';
import { ApiTags } from '@nestjs/swagger';
import { decryptApiKey } from '@novu/application-generic';
import { EnvironmentRepository, NotificationTemplateEntity, NotificationTemplateRepository } from '@novu/dal';
import { Client, Event, workflow, Step, Workflow } from '@novu/framework';
import { ApiCommonResponses } from '../shared/framework/response.decorator';
import { NovuNestjsHandler } from './novu-nestjs-handler';

// Unfortunately we need this mapper because the `in_app` step type uses `step.inApp()` in Framework.
const stepFnFromStepType: Record<Exclude<StepTypeEnum, StepTypeEnum.CUSTOM | StepTypeEnum.TRIGGER>, keyof Step> = {
  [StepTypeEnum.IN_APP]: 'inApp',
  [StepTypeEnum.EMAIL]: 'email',
  [StepTypeEnum.SMS]: 'sms',
  [StepTypeEnum.CHAT]: 'chat',
  [StepTypeEnum.PUSH]: 'push',
  [StepTypeEnum.DIGEST]: 'digest',
  [StepTypeEnum.DELAY]: 'delay',
};

@ApiCommonResponses()
@Controller('/environments')
@UseInterceptors(ClassSerializerInterceptor)
@ApiTags('Environments')
export class EnvironmentsBridgeController {
  constructor(
    private workflowsRepository: NotificationTemplateRepository,
    private environmentsRepository: EnvironmentRepository
  ) {}

  @Get('/:environmentId/bridge')
  async getHandler(@Req() req: Request, @Res() res: Response, @Param('environmentId') environmentId: string) {
    /*
     * TODO: remove the GET handler, it's only used right now for the bridge health check,
     * and it's not needed for UI-defined workflows.
     *
     * I'm leaving it here as a reminder that we need to remove the UI health-check for Novu-managed
     * bridge environments.
     */
    const novuBridgeHandler = new NovuNestjsHandler({
      workflows: [],
      client: new Client({
        strictAuthentication: false,
        secretKey: await this.getApiKey(environmentId),
      }),
    });
    await novuBridgeHandler.handleRequest(req, res, 'GET');
  }

  @Post('/:environmentId/bridge')
  async postHandler(
    @Req() req: Request,
    @Res() res: Response,
    @Param('environmentId') environmentId: string,
    @Query('workflowId') workflowId: string,
    @Body() event: Event
  ) {
    const foundWorkflow = await this.getWorkflow(environmentId, workflowId);

    const programmaticallyCreatedWorkflow = this.createWorkflow(foundWorkflow, event.controls);

    const novuBridgeHandler = new NovuNestjsHandler({
      workflows: [programmaticallyCreatedWorkflow],
      client: new Client({ strictAuthentication: true, secretKey: await this.getApiKey(environmentId) }),
    });

    await novuBridgeHandler.handleRequest(req, res, 'POST');
  }

  // TODO: wrap the secret key fetching per environmentId in a usecase, including the decryption, add caching.
  private async getApiKey(environmentId: string): Promise<string> {
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
          await step[stepFnFromStepType[staticStep.template!.type]](staticStep.stepId, () => controls, {
            // TODO: fix the step typings, `controls` lives on template property, not step
            controlSchema: (staticStep.template as unknown as typeof staticStep).controls?.schema,
            /*
             * TODO: add conditions
             * Used to construct conditions defined with https://react-querybuilder.js.org/ or similar
             * skip: () => !foundWorkflow.preferences.channels[staticStep.type],
             */
          });
        }
      },
      {
        /*
         * TODO: these are probably not needed, given that this endpoint focuses on execution only.
         * however we should reconsider if we decide to expose Workflow options to the `workflow` function.
         *
         * preferences: foundWorkflow.preferences,
         * tags: foundWorkflow.tags,
         */
      }
    );
  }
}
