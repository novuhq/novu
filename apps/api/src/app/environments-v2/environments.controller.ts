import { ClassSerializerInterceptor, Controller, Get, Param, UseInterceptors } from '@nestjs/common';
import { UserSessionData } from '@novu/shared';
import { ApiTags } from '@nestjs/swagger';
import { ApiExcludeController } from '@nestjs/swagger/dist/decorators/api-exclude-controller.decorator';
import { SkipPermissionsCheck } from '@novu/application-generic';
import { UserSession } from '../shared/framework/user.decorator';
import { GetEnvironmentTags, GetEnvironmentTagsCommand } from './usecases/get-environment-tags';
import { ExternalApiAccessible } from '../auth/framework/external-api.decorator';
import { ApiCommonResponses, ApiResponse } from '../shared/framework/response.decorator';
import { RequireAuthentication } from '../auth/framework/auth.decorator';
import { GetEnvironmentTagsDto } from './dtos/get-environment-tags.dto';

@ApiCommonResponses()
@Controller({ path: `/environments`, version: '2' })
@UseInterceptors(ClassSerializerInterceptor)
@RequireAuthentication()
@ApiTags('Environments')
@ApiExcludeController()
export class EnvironmentsController {
  constructor(private getEnvironmentTagsUsecase: GetEnvironmentTags) {}

  @Get('/:environmentId/tags')
  @ApiResponse(GetEnvironmentTagsDto)
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
}
