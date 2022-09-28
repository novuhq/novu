import { HttpService } from '@nestjs/axios';
import { Injectable, Inject } from '@nestjs/common';
import { lastValueFrom } from 'rxjs';
import { GetApiKeysCommand } from '../../../environments/usecases/get-api-keys/get-api-keys.command';
import { GetApiKeys } from '../../../environments/usecases/get-api-keys/get-api-keys.usecase';
import { GetEnvironment, GetEnvironmentCommand } from '../../../environments/usecases/get-environment';
import { ApiException } from '../../../shared/exceptions/api.exception';
import { SetupIntegrationCommand } from './setup-integration.command';

interface ISetEnvironment {
  token: string;
  projectIds: string[];
  teamId: string;
  identifier: string;
  secretKey: string;
}

@Injectable()
export class SetupIntegration {
  @Inject()
  private getApiKeyUsecase: GetApiKeys;
  @Inject()
  private getEnvironmentUsecase: GetEnvironment;

  constructor(private httpService: HttpService) {}

  async execute(command: SetupIntegrationCommand): Promise<{
    success: boolean;
  }> {
    try {
      const tokenData = await this.getVercelToken(command.vercelIntegrationCode);

      const projects = await this.getVercelProjects(tokenData.accessToken, tokenData.teamId);

      const projectIds = projects.map((project) => project.id);

      const envKeys = await this.getEnvKeys(command);

      await this.setEnvironments({
        projectIds,
        identifier: envKeys.clientKey,
        secretKey: envKeys.privateKey,
        teamId: tokenData.teamId,
        token: tokenData.accessToken,
      });

      return {
        success: true,
      };
    } catch (error) {
      throw new ApiException(
        error?.response?.data?.error_description || error?.response?.data?.message || error.message
      );
    }
  }

  async getVercelToken(code: string) {
    const postData = new URLSearchParams({
      code,
      client_id: process.env.VERCEL_CLIENT_ID,
      client_secret: process.env.VERCEL_CLIENT_SECRET,
      redirect_uri: process.env.VERCEL_REDIRECT_URI,
    });

    const response = await lastValueFrom(
      this.httpService.post(`${process.env.VERCEL_BASE_URL}/v2/oauth/access_token`, postData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      })
    );

    const data = await response.data;

    return {
      accessToken: data.access_token,
      userId: data.user_id,
      teamId: data.team_id,
    };
  }

  async getVercelProjects(token: string, teamId: string) {
    const response = await lastValueFrom(
      this.httpService.get(`${process.env.VERCEL_BASE_URL}/v4/projects${teamId ? `?teamId=${teamId}` : ''}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
    );

    return response.data.projects;
  }

  async getEnvKeys(command: SetupIntegrationCommand) {
    const apiKeysResponse = await this.getApiKeyUsecase.execute(
      GetApiKeysCommand.create({
        environmentId: command.environmentId,
        organizationId: command.organizationId,
        userId: command.userId,
      })
    );

    const envResponse = await this.getEnvironmentUsecase.execute(
      GetEnvironmentCommand.create({
        organizationId: command.organizationId,
        userId: command.userId,
        environmentId: command.environmentId,
      })
    );

    return {
      privateKey: apiKeysResponse[0].key,
      clientKey: envResponse.identifier,
    };
  }

  async setEnvironments({ identifier, projectIds, secretKey, teamId, token }: ISetEnvironment) {
    const projectApiUrl = `${process.env.VERCEL_BASE_URL}/v9/projects`;
    const target = ['production', 'preview', 'development'];
    const type = 'encrypted';

    const apiKeys = [
      {
        target,
        type,
        value: identifier,
        key: 'NOVU_CLIENT_APP_ID',
      },
      {
        target,
        type,
        value: secretKey,
        key: 'NOVU_API_SECRET',
      },
    ];

    await Promise.all(
      projectIds.map((projectId) =>
        lastValueFrom(
          this.httpService.post(`${projectApiUrl}/${projectId}/env${teamId ? `?teamId=${teamId}` : ''}`, apiKeys, {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          })
        )
      )
    );
  }
}
