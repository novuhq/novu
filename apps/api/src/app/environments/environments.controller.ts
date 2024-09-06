import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Put,
  Query,
  Req,
  Res,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiAuthSchemeEnum, MemberRoleEnum, StepTypeEnum, UserSessionData } from '@novu/shared';
import { ApiExcludeEndpoint, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RolesGuard, Roles, decryptApiKey } from '@novu/application-generic';
import { EnvironmentRepository, NotificationTemplateRepository } from '@novu/dal';
import { Client, Event, workflow, Step } from '@novu/framework';
import { UserSession } from '../shared/framework/user.decorator';
import { CreateEnvironment } from './usecases/create-environment/create-environment.usecase';
import { CreateEnvironmentCommand } from './usecases/create-environment/create-environment.command';
import { CreateEnvironmentRequestDto } from './dtos/create-environment-request.dto';
import { GetApiKeysCommand } from './usecases/get-api-keys/get-api-keys.command';
import { GetApiKeys } from './usecases/get-api-keys/get-api-keys.usecase';
import { GetEnvironment, GetEnvironmentCommand } from './usecases/get-environment';
import { GetMyEnvironments } from './usecases/get-my-environments/get-my-environments.usecase';
import { GetMyEnvironmentsCommand } from './usecases/get-my-environments/get-my-environments.command';
import { ApiKey } from '../shared/dtos/api-key';
import { EnvironmentResponseDto } from './dtos/environment-response.dto';
import { ExternalApiAccessible } from '../auth/framework/external-api.decorator';
import { RegenerateApiKeys } from './usecases/regenerate-api-keys/regenerate-api-keys.usecase';
import { UpdateEnvironmentCommand } from './usecases/update-environment/update-environment.command';
import { UpdateEnvironment } from './usecases/update-environment/update-environment.usecase';
import { UpdateEnvironmentRequestDto } from './dtos/update-environment-request.dto';
import { ApiCommonResponses, ApiResponse } from '../shared/framework/response.decorator';
import { UserAuthentication } from '../shared/framework/swagger/api.key.security';
import { SdkGroupName } from '../shared/framework/swagger/sdk.decorators';
import { NovuNestjsHandler } from './novu-nestjs-handler';

@ApiCommonResponses()
@Controller('/environments')
@UseInterceptors(ClassSerializerInterceptor)
@ApiTags('Environments')
export class EnvironmentsController {
  constructor(
    private createEnvironmentUsecase: CreateEnvironment,
    private updateEnvironmentUsecase: UpdateEnvironment,
    private getApiKeysUsecase: GetApiKeys,
    private regenerateApiKeysUsecase: RegenerateApiKeys,
    private getEnvironmentUsecase: GetEnvironment,
    private getMyEnvironmentsUsecase: GetMyEnvironments,
    private workflowsRepository: NotificationTemplateRepository,
    private environmentsRepository: EnvironmentRepository
  ) {}

  @Get('/me')
  @ApiOperation({
    summary: 'Get current environment',
  })
  @ApiResponse(EnvironmentResponseDto)
  @ExternalApiAccessible()
  @UserAuthentication()
  async getCurrentEnvironment(@UserSession() user: UserSessionData): Promise<EnvironmentResponseDto> {
    return await this.getEnvironmentUsecase.execute(
      GetEnvironmentCommand.create({
        environmentId: user.environmentId,
        userId: user._id,
        organizationId: user.organizationId,
      })
    );
  }

  @Post('/')
  @ApiOperation({
    summary: 'Create environment',
  })
  @ApiExcludeEndpoint()
  @ApiResponse(EnvironmentResponseDto, 201)
  @UserAuthentication()
  async createEnvironment(
    @UserSession() user: UserSessionData,
    @Body() body: CreateEnvironmentRequestDto
  ): Promise<EnvironmentResponseDto> {
    return await this.createEnvironmentUsecase.execute(
      CreateEnvironmentCommand.create({
        name: body.name,
        userId: user._id,
        organizationId: user.organizationId,
      })
    );
  }

  @Get('/')
  @ApiOperation({
    summary: 'Get environments',
  })
  @ApiResponse(EnvironmentResponseDto, 200, true)
  @ExternalApiAccessible()
  @UserAuthentication()
  async listMyEnvironments(@UserSession() user: UserSessionData): Promise<EnvironmentResponseDto[]> {
    return await this.getMyEnvironmentsUsecase.execute(
      GetMyEnvironmentsCommand.create({
        organizationId: user.organizationId,
        environmentId: user.environmentId,
        includeAllApiKeys: user.scheme === ApiAuthSchemeEnum.BEARER,
      })
    );
  }

  @Put('/:environmentId')
  @ApiOperation({
    summary: 'Update env by id',
  })
  @ApiExcludeEndpoint()
  @ApiResponse(EnvironmentResponseDto)
  @UserAuthentication()
  async updateMyEnvironment(
    @UserSession() user: UserSessionData,
    @Param('environmentId') environmentId: string,
    @Body() payload: UpdateEnvironmentRequestDto
  ) {
    return await this.updateEnvironmentUsecase.execute(
      UpdateEnvironmentCommand.create({
        environmentId,
        organizationId: user.organizationId,
        userId: user._id,
        name: payload.name,
        identifier: payload.identifier,
        _parentId: payload.parentId,
        dns: payload.dns,
        bridge: payload.bridge,
      })
    );
  }

  @Get('/:environmentId/bridge')
  async getHandler(@Req() req: Request, @Res() res: Response) {
    /*
     * TODO: remove the GET handler, it's only used right now for the bridge health check,
     * and it's not needed for UI-defined workflows.
     *
     * I'm leaving it here as a reminder that we need to remove the UI health-check for Novu-managed
     * bridge environments.
     */
    const novuBridgeHandler = new NovuNestjsHandler({
      workflows: [],
      client: new Client({ strictAuthentication: false }),
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
    // TODO: refactor this into a usecase, add caching.
    const foundWorkflow = await this.workflowsRepository.findByTriggerIdentifier(environmentId, workflowId);

    if (!foundWorkflow) {
      throw new NotFoundException('Workflow not found');
    }

    // TODO: wrap the secret key fetching per environmentId in a usecase, including the decryption, add caching.
    const environment = await this.environmentsRepository.findOne({ _id: environmentId });
    if (!environment) {
      throw new NotFoundException('Environment not found');
    }
    const secretKey = decryptApiKey(environment.apiKeys[0].key);

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

    const programmaticallyCreatedWorkflow = workflow(
      foundWorkflow.name,
      async ({ step }) => {
        for await (const staticStep of foundWorkflow.steps) {
          await step[stepFnFromStepType[staticStep.template!.type]](staticStep.stepId, () => event.controls, {
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

    const novuBridgeHandler = new NovuNestjsHandler({
      workflows: [programmaticallyCreatedWorkflow],
      client: new Client({ strictAuthentication: true, secretKey }),
    });

    await novuBridgeHandler.handleRequest(req, res, 'POST');
  }

  @Get('/api-keys')
  @ApiOperation({
    summary: 'Get api keys',
  })
  @ApiResponse(ApiKey, 200, true)
  @ExternalApiAccessible()
  @SdkGroupName('Environments.ApiKeys')
  @UserAuthentication()
  async listOrganizationApiKeys(@UserSession() user: UserSessionData): Promise<ApiKey[]> {
    const command = GetApiKeysCommand.create({
      userId: user._id,
      organizationId: user.organizationId,
      environmentId: user.environmentId,
    });

    return await this.getApiKeysUsecase.execute(command);
  }

  @Post('/api-keys/regenerate')
  @ApiResponse(ApiKey, 201, true)
  @UseGuards(RolesGuard)
  @Roles(MemberRoleEnum.ADMIN)
  @UserAuthentication()
  async regenerateOrganizationApiKeys(@UserSession() user: UserSessionData): Promise<ApiKey[]> {
    const command = GetApiKeysCommand.create({
      userId: user._id,
      organizationId: user.organizationId,
      environmentId: user.environmentId,
    });

    return await this.regenerateApiKeysUsecase.execute(command);
  }
}
