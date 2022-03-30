import { Injectable } from '@nestjs/common';
import { ApplicationRepository } from '@novu/dal';
import { UpdateBrandingDetailsCommand } from './update-branding-details.command';

@Injectable()
export class UpdateBrandingDetails {
  constructor(private applicationRepository: ApplicationRepository) {}

  async execute(command: UpdateBrandingDetailsCommand) {
    const payload = {
      color: command.color,
      logo: command.logo,
      fontColor: command.fontColor,
      contentBackground: command.contentBackground,
      fontFamily: command.fontFamily,
    };

    await this.applicationRepository.updateBrandingDetails(command.applicationId, payload);

    return payload;
  }
}
