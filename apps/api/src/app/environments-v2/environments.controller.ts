import {
  ClassSerializerInterceptor,
  Controller,
  Get,
  Param,
  Post,
  Body,
  UseInterceptors,
  HttpCode,
} from '@nestjs/common';
import { UserSessionData, PermissionsEnum } from '@novu/shared';
import { ApiTags, ApiOperation, ApiExcludeEndpoint } from '@nestjs/swagger';
import { SkipPermissionsCheck, RequirePermissions } from '@novu/application-generic';
import { UserSession } from '../shared/framework/user.decorator';
import { GetEnvironmentTags, GetEnvironmentTagsCommand } from './usecases/get-environment-tags';
import { PublishEnvironmentUseCase } from './usecases/publish-environment/publish-environment.usecase';
import { DiffEnvironmentUseCase } from './usecases/diff-environment/diff-environment.usecase';
import { PublishEnvironmentCommand } from './usecases/publish-environment/publish-environment.command';
import { DiffEnvironmentCommand } from './usecases/diff-environment/diff-environment.command';
import { ExternalApiAccessible } from '../auth/framework/external-api.decorator';
import { ApiCommonResponses, ApiResponse } from '../shared/framework/response.decorator';
import { RequireAuthentication } from '../auth/framework/auth.decorator';
import { SdkGroupName, SdkMethodName } from '../shared/framework/swagger/sdk.decorators';
import { GetEnvironmentTagsDto } from './dtos/get-environment-tags.dto';
import {
  PublishEnvironmentRequestDto,
  PublishEnvironmentResponseDto,
  DiffEnvironmentRequestDto,
  DiffEnvironmentResponseDto,
} from './dtos';

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
  @ApiResponse(GetEnvironmentTagsDto, 200, true)
  @SdkMethodName('getTags')
  @ExternalApiAccessible()
  @SkipPermissionsCheck()
  async getEnvironmentTags(
    @UserSession() user: UserSessionData,
    @Param('environmentId') environmentId: string
  ): Promise<GetEnvironmentTagsDto[]> {
    return await this.getEnvironmentTagsUsecase.execute(
      GetEnvironmentTagsCommand.create({
        environmentId,
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
    const command = PublishEnvironmentCommand.create({
      user,
      sourceEnvironmentId: body.sourceEnvironmentId,
      targetEnvironmentId,
      dryRun: body.dryRun,
    });

    return await this.publishEnvironmentUseCase.execute(command);
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
