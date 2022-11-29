import { Injectable } from '@nestjs/common';
import * as hat from 'hat';
import { StorageService } from '../../../shared/services/storage/storage.service';
import { UploadUrlResponse } from '../../dtos/upload-url-response.dto';
import { GetSignedUrlCommand } from './get-signed-url.command';

const mimeTypes = {
  jpeg: 'image/jpeg',
  png: 'image/png',
};

@Injectable()
export class GetSignedUrl {
  constructor(private storageService: StorageService) {}

  async execute(command: GetSignedUrlCommand): Promise<UploadUrlResponse> {
    const path = `${command.organizationId}/${command.environmentId}/${hat()}.${command.extension}`;

    const response = await this.storageService.getSignedUrl(path, mimeTypes[command.extension]);

    return response;
  }
}
