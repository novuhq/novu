import { Injectable } from '@nestjs/common';
import { StorageService } from '@novu/application-generic';
import { FILE_EXTENSION_TO_MIME_TYPE, UploadTypesEnum } from '@novu/shared';
import { randomBytes } from 'crypto';

import { UploadUrlResponse } from '../../dtos/upload-url-response.dto';
import { GetSignedUrlCommand } from './get-signed-url.command';

@Injectable()
export class GetSignedUrl {
  constructor(private storageService: StorageService) {}

  private mapTypeToPath(command: GetSignedUrlCommand) {
    const randomId = randomBytes(16).toString('hex');
    switch (command.type) {
      case UploadTypesEnum.USER_PROFILE:
        return `users/${command.userId}/profile-pictures/${randomId}.${command.extension}`;
      case UploadTypesEnum.BRANDING:
      default:
        return `${command.organizationId}/${command.environmentId}/${randomId}.${command.extension}`;
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
