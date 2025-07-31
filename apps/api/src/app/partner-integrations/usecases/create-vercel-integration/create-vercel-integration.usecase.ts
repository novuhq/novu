import { HttpService } from '@nestjs/axios';
import { BadRequestException, Injectable } from '@nestjs/common';
import { AnalyticsService } from '@novu/application-generic';
import { OrganizationRepository, PartnerTypeEnum } from '@novu/dal';
import { lastValueFrom } from 'rxjs';

import { CreateVercelIntegrationResponseDto } from '../../dtos/create-vercel-integration-response.dto';
import { CreateVercelIntegrationCommand } from './create-vercel-integration.command';

@Injectable()
export class CreateVercelIntegration {
  constructor(
    private httpService: HttpService,
    private organizationRepository: OrganizationRepository,
    private analyticsService: AnalyticsService
  ) {}

  async execute(command: CreateVercelIntegrationCommand): Promise<CreateVercelIntegrationResponseDto> {
    try {
      const tokenData = await this.getVercelToken(command.vercelIntegrationCode);

      const configuration = {
        accessToken: tokenData.accessToken,
        configurationId: command.configurationId,
        teamId: tokenData.teamId,
        partnerType: PartnerTypeEnum.VERCEL,
      };

      await this.organizationRepository.upsertPartnerConfiguration({
        organizationId: command.organizationId,
        configuration,
      });

      this.analyticsService.track('Create Vercel Integration - [Partner Integrations]', command.userId, {
        _organization: command.organizationId,
      });

      return {
        success: true,
      };
    } catch (error) {
      throw new BadRequestException(
        error?.response?.data?.error_description || error?.response?.data?.message || error.message
      );
    }
  }

  private async getVercelToken(code: string): Promise<{
    accessToken: string;
    teamId: string;
  }> {
    try {
      const postData = new URLSearchParams({
        code: code as string,
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

      const { data } = response;

      return {
        accessToken: data.access_token,
        teamId: data.team_id,
      };
    } catch (error) {
      throw new BadRequestException(
        error?.response?.data?.error_description || error?.response?.data?.message || error.message
      );
    }
  }
}
