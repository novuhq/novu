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
import { ApiExcludeController } from '@nestjs/swagger';
import {
  AnalyticsService,
  ExternalApiAccessible,
  RequirePermissions,
  SkipPermissionsCheck,
  UserSession,
} from '@novu/application-generic';
import { ControlValuesRepository, EnvironmentRepository, NotificationTemplateRepository } from '@novu/dal';
import { HttpHeaderKeysEnum } from '@novu/framework/internal';
import {
  ControlValuesLevelEnum,
  PermissionsEnum,
  ResourceOriginEnum,
  ResourceTypeEnum,
  UserSessionData,
} from '@novu/shared';
import { RequireAuthentication } from '../auth/framework/auth.decorator';
import { CreateBridgeRequestDto } from './dtos/create-bridge-request.dto';
import { CreateBridgeResponseDto } from './dtos/create-bridge-response.dto';
import { ValidateBridgeUrlRequestDto } from './dtos/validate-bridge-url-request.dto';
import { ValidateBridgeUrlResponseDto } from './dtos/validate-bridge-url-response.dto';
import { GetBridgeStatusCommand } from './usecases/get-bridge-status/get-bridge-status.command';
import { GetBridgeStatus } from './usecases/get-bridge-status/get-bridge-status.usecase';
import { PreviewStep, PreviewStepCommand } from './usecases/preview-step';
import { StoreControlValuesCommand, StoreControlValuesUseCase } from './usecases/store-control-values';
import { SyncCommand } from './usecases/sync';
import { Sync } from './usecases/sync/sync.usecase';

@Controller('/bridge')
@UseInterceptors(ClassSerializerInterceptor)
@RequireAuthentication()
@ApiExcludeController()
export class BridgeController {
  constructor(
    private syncUsecase: Sync,
    private getBridgeStatus: GetBridgeStatus,
    private environmentRepository: EnvironmentRepository,
    private notificationTemplateRepository: NotificationTemplateRepository,
    private controlValuesRepository: ControlValuesRepository,
    private storeControlValuesUseCase: StoreControlValuesUseCase,
    private previewStep: PreviewStep,
    private analyticsService: AnalyticsService
  ) {}

  @Get('/status')
  @SkipPermissionsCheck()
  async health(@UserSession() user: UserSessionData) {
    return this.getBridgeStatus.execute(
      GetBridgeStatusCommand.create({
        environmentId: user.environmentId,
      })
    );
  }

  @Post('/preview/:workflowId/:stepId')
  @RequirePermissions(PermissionsEnum.WORKFLOW_READ)
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
        controls: data.controls,
        payload: data.payload,
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        userId: user._id,
        workflowOrigin: ResourceOriginEnum.EXTERNAL,
      })
    );
  }

  @Post('/sync')
  @ExternalApiAccessible()
  @RequirePermissions(PermissionsEnum.WORKFLOW_WRITE)
  async createBridgesByDiscovery(
    @Headers(HttpHeaderKeysEnum.NOVU_ANONYMOUS) anonymousId: string,
    @UserSession() user: UserSessionData,
    @Body() body: CreateBridgeRequestDto,
    @Query('source') source?: string
  ): Promise<CreateBridgeResponseDto> {
    if (anonymousId) {
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
  @RequirePermissions(PermissionsEnum.WORKFLOW_READ)
  async createDiscoverySoft(
    @Headers(HttpHeaderKeysEnum.NOVU_ANONYMOUS) anonymousId: string,
    @UserSession() user: UserSessionData,
    @Body() body: CreateBridgeRequestDto
  ): Promise<CreateBridgeResponseDto> {
    const environment = await this.environmentRepository.findOne({ _id: user.environmentId });

    if (!environment?.echo?.url) {
      throw new BadRequestException('Bridge URL not found');
    }

    if (anonymousId) {
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
        $in: [ResourceTypeEnum.ECHO, ResourceTypeEnum.BRIDGE],
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
  @RequirePermissions(PermissionsEnum.WORKFLOW_READ)
  async getControls(
    @UserSession() user: UserSessionData,
    @Param('workflowId') workflowId: string,
    @Param('stepId') stepId: string
  ) {
    const workflowExist = await this.notificationTemplateRepository.findByTriggerIdentifier(
      user.environmentId,
      workflowId,
      undefined,
      false
    );
    if (!workflowExist) {
      throw new NotFoundException('Workflow not found');
    }
    const step = workflowExist?.steps.find((item) => item.stepId === stepId);

    if (!step || !step._id) {
      throw new NotFoundException('Step not found');
    }

    const result = await this.controlValuesRepository.findOne({
      _environmentId: user.environmentId,
      _organizationId: user.organizationId,
      _workflowId: workflowExist._id,
      _stepId: step._id,
      level: ControlValuesLevelEnum.STEP_CONTROLS,
    });

    return result;
  }

  @Put('/controls/:workflowId/:stepId')
  @ExternalApiAccessible()
  @RequirePermissions(PermissionsEnum.WORKFLOW_WRITE)
  async createControls(
    @Param('workflowId') workflowId: string,
    @Param('stepId') stepId: string,
    @UserSession() user: UserSessionData,
    @Body() body: any
  ) {
    return this.storeControlValuesUseCase.execute(
      StoreControlValuesCommand.create({
        stepId,
        workflowId,
        controlValues: body.variables,
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        userId: user._id,
      })
    );
  }

  @Post('/validate')
  @ExternalApiAccessible()
  @RequirePermissions(PermissionsEnum.BRIDGE_WRITE)
  async validateBridgeUrl(
    @UserSession() user: UserSessionData,
    @Body() body: ValidateBridgeUrlRequestDto
  ): Promise<ValidateBridgeUrlResponseDto> {
    try {
      const result = await this.getBridgeStatus.execute(
        GetBridgeStatusCommand.create({
          environmentId: user.environmentId,
          statelessBridgeUrl: body.bridgeUrl,
        })
      );

      return { isValid: result.status === 'ok' };
    } catch (err: any) {
      return { isValid: false, error: err.message };
    }
  }
}
