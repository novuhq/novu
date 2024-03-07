import { Injectable } from '@nestjs/common';
import * as hat from 'hat';
import { StorageService } from '@novu/application-generic';

import { UploadUrlResponse } from '../../dtos/upload-url-response.dto';
import { GetUserProfilePictureSignedUrlCommand } from './get-user-profile-picture-signed-url.command';

const mimeTypes = {
  jpeg: 'image/jpeg',
  png: 'image/png',
};

@Injectable()
export class GetUserProfilePictureSignedUrl {
  constructor(private storageService: StorageService) {}

  async execute(command: GetUserProfilePictureSignedUrlCommand): Promise<UploadUrlResponse> {
    const path = `users/profile-pictures/${command.userId}/${hat()}.${command.extension}`;

    const response = await this.storageService.getSignedUrl(path, mimeTypes[command.extension]);

    return response;
  }
}
