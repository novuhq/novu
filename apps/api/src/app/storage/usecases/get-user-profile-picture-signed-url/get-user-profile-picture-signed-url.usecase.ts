import { Injectable } from '@nestjs/common';
import { StorageService } from '@novu/application-generic';
import { MIME_TYPES_LOOKUP } from '@novu/shared';
import * as hat from 'hat';
import { UploadUrlResponse } from '../../dtos/upload-url-response.dto';
import { GetUserProfilePictureSignedUrlCommand } from './get-user-profile-picture-signed-url.command';

@Injectable()
export class GetUserProfilePictureSignedUrl {
  constructor(private storageService: StorageService) {}

  async execute(command: GetUserProfilePictureSignedUrlCommand): Promise<UploadUrlResponse> {
    const path = `users/profile-pictures/${command.userId}/${hat()}.${command.extension}`;

    const response = await this.storageService.getSignedUrl(path, MIME_TYPES_LOOKUP[command.extension]);

    return response;
  }
}
