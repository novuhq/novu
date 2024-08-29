import {
  BadRequestException,
  Body,
  ClassSerializerInterceptor,
  Controller,
  Get,
  Headers,
  NotFoundException,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';

import { UserSessionData, ControlVariablesLevelEnum, WorkflowTypeEnum } from '@novu/shared';
import {
  AnalyticsService,
  ExternalApiAccessible,
  UserAuthGuard,
  UserSession,
  UpsertPreferences,
  UpsertPreferencesCommand,
} from '@novu/application-generic';
import {
  EnvironmentRepository,
  NotificationTemplateRepository,
  ControlVariablesRepository,
  PreferencesActorEnum,
} from '@novu/dal';

import { ApiExcludeController } from '@nestjs/swagger';

import { StoreControlVariables, StoreControlVariablesCommand } from './usecases/store-control-variables';
import { PreviewStep, PreviewStepCommand } from './usecases/preview-step';
import { SyncCommand } from './usecases/sync';
import { Sync } from './usecases/sync/sync.usecase';
import { ValidateBridgeUrlRequestDto } from './dtos/validate-bridge-url-request.dto';
import { ValidateBridgeUrlResponseDto } from './dtos/validate-bridge-url-response.dto';
import { GetBridgeStatus } from './usecases/get-bridge-status/get-bridge-status.usecase';
import { GetBridgeStatusCommand } from './usecases/get-bridge-status/get-bridge-status.command';
import { CreateBridgeRequestDto } from './dtos/create-bridge-request.dto';
import { CreateBridgeResponseDto } from './dtos/create-bridge-response.dto';

@Controller('/bridge')
@UseInterceptors(ClassSerializerInterceptor)
@ApiExcludeController()
export class BridgeController {
  constructor(
    private syncUsecase: Sync,
    private validateBridgeUrlUsecase: GetBridgeStatus,
    private environmentRepository: EnvironmentRepository,
    private notificationTemplateRepository: NotificationTemplateRepository,
    private controlVariablesRepository: ControlVariablesRepository,
    private storeControlVariables: StoreControlVariables,
    private previewStep: PreviewStep,
    private analyticsService: AnalyticsService
  ) {}

  @Get('/status')
  @UseGuards(UserAuthGuard)
  async health(@UserSession() user: UserSessionData) {
    const environment = await this.environmentRepository.findOne({ _id: user.environmentId });
    if (!environment?.echo?.url) {
      throw new BadRequestException('Bridge URL not found');
    }

    const result = await this.validateBridgeUrlUsecase.execute(
      GetBridgeStatusCommand.create({
        bridgeUrl: environment.echo.url,
      })
    );

    if (result.status !== 'ok') {
      throw new Error('Bridge URL is not accessible');
    }

    return result;
  }

  @Post('/preview/:workflowId/:stepId')
  @UseGuards(UserAuthGuard)
  async preview(
    @Param('workflowId') workflowId: string,
    @Param('stepId') stepId: string,
    @Body() data: any,
    @UserSession() user: UserSessionData
  ) {
    return this.previewStep.execute(
      PreviewStepCommand.create({
        workflowId,
        stepId,
        inputs: data.controls || data.inputs,
        controls: data.controls || data.inputs,
        data: data.payload,
        bridgeUrl: data.bridgeUrl,
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        userId: user._id,
      })
    );
  }

  @Post('/sync')
  @ExternalApiAccessible()
  @UseGuards(UserAuthGuard)
  async createBridgesByDiscovery(
    @Headers('x-novu-anonymous') anonymousIdDeprecated: string,
    @Headers('novu-anonymous') anonymousId: string,
    @UserSession() user: UserSessionData,
    @Body() body: CreateBridgeRequestDto,
    @Query('source') source?: string
  ): Promise<CreateBridgeResponseDto> {
    const chosenAnonymousIdHeader = anonymousId ?? anonymousIdDeprecated;
    if (chosenAnonymousIdHeader && chosenAnonymousIdHeader !== 'null') {
      this.analyticsService.alias(anonymousId, user._id);
    }

    return this.syncUsecase.execute(
      SyncCommand.create({
        organizationId: user.organizationId,
        userId: user._id,
        environmentId: user.environmentId,
        workflows: body.workflows,
        bridgeUrl: body.bridgeUrl,
        source,
      })
    );
  }

  @Post('/diff')
  @ExternalApiAccessible()
  @UseGuards(UserAuthGuard)
  async createDiscoverySoft(
    @Headers('x-novu-anonymous') anonymousId: string,
    @UserSession() user: UserSessionData,
    @Body() body: CreateBridgeRequestDto
  ): Promise<CreateBridgeResponseDto> {
    const environment = await this.environmentRepository.findOne({ _id: user.environmentId });

    if (!environment?.echo?.url) {
      throw new BadRequestException('Bridge URL not found');
    }

    if (anonymousId && anonymousId !== 'null') {
      this.analyticsService.alias(anonymousId, user._id);
    }

    this.analyticsService.track('Diff Request - [Bridge API]', user._id, {
      _organization: user.organizationId,
      _environment: user.environmentId,
      workflowsCount: body.workflows?.length || 0,
    });

    const templates = await this.notificationTemplateRepository.find({
      _environmentId: user.environmentId,
      type: {
        $in: [WorkflowTypeEnum.ECHO, WorkflowTypeEnum.BRIDGE],
      },
    });

    const templatesDefinitions = templates?.map((i) => i.rawData);

    return {
      current: {
        workflows: templatesDefinitions,
        bridgeUrl: environment.echo?.url,
      },
      new: body,
    };
  }

  @Get('/controls/:workflowId/:stepId')
  @ExternalApiAccessible()
  @UseGuards(UserAuthGuard)
  async getControls(
    @UserSession() user: UserSessionData,
    @Param('workflowId') workflowId: string,
    @Param('stepId') stepId: string
  ) {
    const workflowExist = await this.notificationTemplateRepository.findByTriggerIdentifier(
      user.environmentId,
      workflowId
    );
    if (!workflowExist) {
      throw new NotFoundException('Workflow not found');
    }

    const result = await this.controlVariablesRepository.findOne({
      _environmentId: user.environmentId,
      _organizationId: user.organizationId,
      _workflowId: workflowExist._id,
      stepId,
      level: ControlVariablesLevelEnum.STEP_CONTROLS,
    });

    return result;
  }

  @Put('/controls/:workflowId/:stepId')
  @ExternalApiAccessible()
  @UseGuards(UserAuthGuard)
  async createControls(
    @Param('workflowId') workflowId: string,
    @Param('stepId') stepId: string,
    @UserSession() user: UserSessionData,
    @Body() body: any
  ) {
    return this.storeControlVariables.execute(
      StoreControlVariablesCommand.create({
        stepId,
        workflowId,
        variables: body.variables,
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        userId: user._id,
      })
    );
  }

  @Post('/validate')
  @ExternalApiAccessible()
  async validateBridgeUrl(@Body() body: ValidateBridgeUrlRequestDto): Promise<ValidateBridgeUrlResponseDto> {
    try {
      const result = await this.validateBridgeUrlUsecase.execute(
        GetBridgeStatusCommand.create({
          bridgeUrl: body.bridgeUrl,
        })
      );

      return { isValid: result.status === 'ok' };
    } catch (err: any) {
      return { isValid: false };
    }
  }
}
