import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { lastValueFrom } from 'rxjs';
import { ApiException } from '../../../shared/exceptions/api.exception';
import { SetupVercelConfigurationResponseDto } from '../../dtos/setup-vercel-integration-response.dto';
import { SetVercelConfigurationCommand } from './set-vercel-configuration.command';
import { OrganizationRepository, PartnerTypeEnum, IPartnerConfiguration } from '@novu/dal';

@Injectable()
export class SetVercelConfiguration {
  constructor(
    private httpService: HttpService,

    private organizationRepository: OrganizationRepository
  ) {}

  async execute(command: SetVercelConfigurationCommand): Promise<SetupVercelConfigurationResponseDto> {
    try {
      const tokenData = await this.getVercelToken(command.vercelIntegrationCode);
      if (!tokenData) throw new ApiException('No token data found');

      const saveConfigurationData = {
        accessToken: tokenData.accessToken,
        configurationId: command.configurationId,
        teamId: tokenData.teamId as string,
        partnerType: PartnerTypeEnum.VERCEL,
      };

      await this.saveConfiguration(command.organizationId, command.userId, saveConfigurationData);

      return {
        success: true,
      };
    } catch (error) {
      throw new ApiException(
        error?.response?.data?.error_description || error?.response?.data?.message || error.message
      );
    }
  }

  private async getVercelToken(code: string): Promise<{
    accessToken: string;
    userId: string;
    teamId: string | null;
  }> {
    const postData = new URLSearchParams({
      code,
      client_id: process.env.VERCEL_CLIENT_ID as string,
      client_secret: process.env.VERCEL_CLIENT_SECRET as string,
      redirect_uri: process.env.VERCEL_REDIRECT_URI as string,
    });

    const response = await lastValueFrom(
      this.httpService.post(`${process.env.VERCEL_BASE_URL}/v2/oauth/access_token`, postData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      })
    );

    const data = response.data;

    return {
      accessToken: data.access_token,
      userId: data.user_id,
      teamId: data.team_id,
    };
  }

  private async saveConfiguration(organizationId: string, userId: string, configuration: IPartnerConfiguration) {
    await this.organizationRepository.updatePartnerConfiguration(organizationId, userId, configuration);
  }
}
