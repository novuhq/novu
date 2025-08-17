import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  UseInterceptors,
} from '@nestjs/common';
import { ApiExcludeEndpoint, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { RequirePermissions, SkipPermissionsCheck } from '@novu/application-generic';
import { PermissionsEnum, UserSessionData } from '@novu/shared';
import { RequireAuthentication } from '../auth/framework/auth.decorator';
import { ExternalApiAccessible } from '../auth/framework/external-api.decorator';
import { ApiCommonResponses, ApiResponse } from '../shared/framework/response.decorator';
import { SdkGroupName, SdkMethodName } from '../shared/framework/swagger/sdk.decorators';
import { UserSession } from '../shared/framework/user.decorator';
import {
  DiffEnvironmentRequestDto,
  DiffEnvironmentResponseDto,
  PublishEnvironmentRequestDto,
  PublishEnvironmentResponseDto,
} from './dtos';
import { GetEnvironmentTagsDto } from './dtos/get-environment-tags.dto';
import { DiffEnvironmentCommand } from './usecases/diff-environment/diff-environment.command';
import { DiffEnvironmentUseCase } from './usecases/diff-environment/diff-environment.usecase';
import { GetEnvironmentTags, GetEnvironmentTagsCommand } from './usecases/get-environment-tags';
import { PublishEnvironmentCommand } from './usecases/publish-environment/publish-environment.command';
import { PublishEnvironmentUseCase } from './usecases/publish-environment/publish-environment.usecase';

@ApiCommonResponses()
@Controller({ path: `/environments`, version: '2' })
@UseInterceptors(ClassSerializerInterceptor)
@RequireAuthentication()
@ApiTags('Environments')
@SdkGroupName('Environments')
export class EnvironmentsController {
  constructor(
    private getEnvironmentTagsUsecase: GetEnvironmentTags,
    private publishEnvironmentUseCase: PublishEnvironmentUseCase,
    private diffEnvironmentUseCase: DiffEnvironmentUseCase
  ) {}

  @Get('/:environmentId/tags')
  @ApiOperation({
    summary: 'Get environment tags',
    description:
      'Retrieve all unique tags used in workflows within the specified environment. These tags can be used for filtering workflows.',
  })
  @ApiParam({
    name: 'environmentId',
    description: 'Environment internal ID (MongoDB ObjectId) or identifier',
    type: String,
    example: '6615943e7ace93b0540ae377',
  })
  @ApiResponse(GetEnvironmentTagsDto, 200, true)
  @SdkMethodName('getTags')
  @ExternalApiAccessible()
  @SkipPermissionsCheck()
  async getEnvironmentTags(
    @UserSession() user: UserSessionData,
    @Param('environmentId') environmentIdOrIdentifier: string
  ): Promise<GetEnvironmentTagsDto[]> {
    return await this.getEnvironmentTagsUsecase.execute(
      GetEnvironmentTagsCommand.create({
        environmentIdOrIdentifier,
        userId: user._id,
        organizationId: user.organizationId,
      })
    );
  }

  @Post('/:targetEnvironmentId/publish')
  @HttpCode(200)
  @ApiOperation({ summary: 'Publish all workflows from source to target environment' })
  @ApiResponse(PublishEnvironmentResponseDto)
  @ExternalApiAccessible()
  @ApiExcludeEndpoint()
  @RequirePermissions(PermissionsEnum.ENVIRONMENT_WRITE)
  async publishEnvironment(
    @UserSession() user: UserSessionData,
    @Param('targetEnvironmentId') targetEnvironmentId: string,
    @Body() body: PublishEnvironmentRequestDto
  ): Promise<PublishEnvironmentResponseDto> {
    return await this.publishEnvironmentUseCase.execute(
      PublishEnvironmentCommand.create({
        user,
        sourceEnvironmentId: body.sourceEnvironmentId,
        targetEnvironmentId,
        dryRun: body.dryRun,
        resources: body.resources,
      })
    );
  }

  @Post('/:targetEnvironmentId/diff')
  @HttpCode(200)
  @ApiOperation({ summary: 'Compare workflows between source and target environments' })
  @ApiResponse(DiffEnvironmentResponseDto)
  @ExternalApiAccessible()
  @ApiExcludeEndpoint()
  @RequirePermissions(PermissionsEnum.ENVIRONMENT_WRITE)
  async diffEnvironment(
    @UserSession() user: UserSessionData,
    @Param('targetEnvironmentId') targetEnvironmentId: string,
    @Body() body: DiffEnvironmentRequestDto
  ): Promise<DiffEnvironmentResponseDto> {
    return await this.diffEnvironmentUseCase.execute(
      DiffEnvironmentCommand.create({
        user,
        sourceEnvironmentId: body.sourceEnvironmentId,
        targetEnvironmentId,
      })
    );
  }
}
