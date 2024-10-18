import { ClassSerializerInterceptor, Controller, Get, Param, UseInterceptors } from '@nestjs/common';
import { UserSessionData } from '@novu/shared';
import { ApiTags } from '@nestjs/swagger';
import { UserSession } from '../shared/framework/user.decorator';
import { GetEnvironmentTags, GetEnvironmentTagsCommand } from './usecases/get-environment-tags';
import { ExternalApiAccessible } from '../auth/framework/external-api.decorator';
import { ApiCommonResponses, ApiResponse } from '../shared/framework/response.decorator';
import { UserAuthentication } from '../shared/framework/swagger/api.key.security';
import { GetEnvironmentTagsDto } from './dtos/get-environment-tags.dto';

@ApiCommonResponses()
@Controller({ path: `/environments`, version: '2' })
@UseInterceptors(ClassSerializerInterceptor)
@UserAuthentication()
@ApiTags('Environments')
export class EnvironmentsController {
  constructor(private getEnvironmentTagsUsecase: GetEnvironmentTags) {}

  @Get('/:environmentId/tags')
  @ApiResponse(GetEnvironmentTagsDto)
  @ExternalApiAccessible()
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
