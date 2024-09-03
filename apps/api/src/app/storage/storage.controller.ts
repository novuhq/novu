import { ClassSerializerInterceptor, Controller, Get, Query, UseInterceptors } from '@nestjs/common';
import { UploadTypesEnum, UserSessionData } from '@novu/shared';

import { ApiExcludeController, ApiOperation, ApiTags } from '@nestjs/swagger';
import { GetSignedUrl } from './usecases/get-signed-url/get-signed-url.usecase';
import { GetSignedUrlCommand } from './usecases/get-signed-url/get-signed-url.command';
import { UserSession } from '../shared/framework/user.decorator';
import { UploadUrlResponse } from './dtos/upload-url-response.dto';
import { ExternalApiAccessible } from '../auth/framework/external-api.decorator';
import { ApiCommonResponses, ApiResponse } from '../shared/framework/response.decorator';
import { UserAuthentication } from '../shared/framework/swagger/api.key.security';

@ApiCommonResponses()
@Controller('/storage')
@ApiTags('Storage')
@UseInterceptors(ClassSerializerInterceptor)
@UserAuthentication()
@ApiExcludeController()
export class StorageController {
  constructor(private getSignedUrlUsecase: GetSignedUrl) {}

  @Get('/upload-url')
  @ApiOperation({
    summary: 'Get upload url',
  })
  @ApiResponse(UploadUrlResponse)
  @ExternalApiAccessible()
  async signedUrl(
    @UserSession() user: UserSessionData,
    @Query('extension') extension: string,
    @Query('type') type: string
  ): Promise<UploadUrlResponse> {
    return await this.getSignedUrlUsecase.execute(
      GetSignedUrlCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        userId: user._id,
        extension,
        type: (type as UploadTypesEnum) || UploadTypesEnum.BRANDING,
      })
    );
  }
}
