import { Injectable } from '@nestjs/common';
import * as hat from 'hat';
import { StorageService } from '../../../shared/services/storage/storage.service';
import { UploadUrlResponse } from '../../dtos/upload-url-response.dto';
import { GetSignedUrlCommand } from './get-signed-url.command';
import { GetOrganization } from '../../../organization/usecases/get-organization/get-organization.usecase';
import { getFileExtensionFromPath } from '../../../shared/services/helper/helper.service';

const mimeTypes = {
  jpeg: 'image/jpeg',
  png: 'image/png',
  jpg: 'image/jpeg',
};

@Injectable()
export class GetSignedUrl {
  constructor(private storageService: StorageService, private getOrganization: GetOrganization) {}

  async execute(command: GetSignedUrlCommand): Promise<UploadUrlResponse> {
    const organization = await this.getOrganization.execute({ id: command.organizationId, userId: command.userId });

    let path = `${command.organizationId}/${command.environmentId}/${hat()}.${command.extension}`;

    if (organization.branding.logo) {
      const currentImagePrefix = organization.branding.logo.split('/').pop().split('.').shift();
      const currentImageExt = getFileExtensionFromPath(organization.branding.logo);

      if (currentImageExt === command.extension) {
        path = `${command.organizationId}/${command.environmentId}/${currentImagePrefix}.${currentImageExt}`;
      } else {
        path = `${command.organizationId}/${command.environmentId}/${currentImagePrefix}.${command.extension}`;
      }
    }

    const response = await this.storageService.getSignedUrl(path, mimeTypes[command.extension]);

    return response;
  }
}
