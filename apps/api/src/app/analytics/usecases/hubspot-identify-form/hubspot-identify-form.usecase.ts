import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { HubspotIdentifyFormCommand } from './hubspot-identify-form.command';

@Injectable()
export class HubspotIdentifyFormUsecase {
  private readonly hubspotPortalId = '44416662';
  private readonly hubspotFormId = 'fc39aa98-4285-4322-9514-52da978baae8';

  constructor(private httpService: HttpService) {}

  async execute(command: HubspotIdentifyFormCommand): Promise<{ success: boolean; hubspotResponse?: any }> {
    const hubspotSubmitUrl = `https://api.hsforms.com/submissions/v3/integration/submit/${this.hubspotPortalId}/${this.hubspotFormId}`;

    const hubspotData = {
      fields: [
        { name: 'email', value: command.email },
        { name: 'lastname', value: command.lastName || 'Unknown' },
        { name: 'firstname', value: command.firstName || 'Unknown' },
        { name: 'app_organizationid', value: command.organizationId },
      ],
      context: {
        hutk: command.hubspotContext,
        pageUri: command.pageUri,
        pageName: command.pageName,
      },
    };

    const response = await firstValueFrom(this.httpService.post(hubspotSubmitUrl, hubspotData));

    return {
      success: true,
      hubspotResponse: response.data,
    };
  }
}
