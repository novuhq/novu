import { Injectable } from '@nestjs/common';
import * as hat from 'hat';
import { StorageService } from '@novu/application-generic';
import { UploadTypesEnum, FILE_EXTENSION_TO_MIME_TYPE } from '@novu/shared';

import { UploadUrlResponse } from '../../dtos/upload-url-response.dto';
import { GetSignedUrlCommand } from './get-signed-url.command';

@Injectable()
export class GetSignedUrl {
  constructor(private storageService: StorageService) {}

  private mapTypeToPath(command: GetSignedUrlCommand) {
    switch (command.type) {
      case UploadTypesEnum.USER_PROFILE:
        return `users/${command.userId}/profile-pictures/${hat()}.${command.extension}`;
      case UploadTypesEnum.BRANDING:
      default:
        return `${command.organizationId}/${command.environmentId}/${hat()}.${command.extension}`;
    }
  }

  async execute(command: GetSignedUrlCommand): Promise<UploadUrlResponse> {
    const response = await this.storageService.getSignedUrl(
      this.mapTypeToPath(command),
      FILE_EXTENSION_TO_MIME_TYPE[command.extension]
    );

    return response;
  }
}
