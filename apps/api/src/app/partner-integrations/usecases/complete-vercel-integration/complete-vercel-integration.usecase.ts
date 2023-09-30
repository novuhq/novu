import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { lastValueFrom } from 'rxjs';
import { EnvironmentEntity, EnvironmentRepository, OrganizationRepository } from '@novu/dal';
import { AnalyticsService } from '@novu/application-generic';

import { CompleteVercelIntegrationCommand } from './complete-vercel-integration.command';
import { GetVercelProjects } from '../get-vercel-projects/get-vercel-projects.usecase';
import { ApiException } from '../../../shared/exceptions/api.exception';

interface ISetEnvironment {
  token: string;
  projectIds: string[];
  teamId: string | null;
  clientKey: string;
  privateKey: string;
}

type MapProjectkeys = {
  privateKey: string;
  clientKey: string;
  projectIds: string[];
};

@Injectable()
export class CompleteVercelIntegration {
  constructor(
    private httpService: HttpService,
    private environmentRepository: EnvironmentRepository,
    private getVercelProjectsUsecase: GetVercelProjects,
    private organizationRepository: OrganizationRepository,
    private analyticsService: AnalyticsService
  ) {}

  async execute(command: CompleteVercelIntegrationCommand): Promise<{ success: boolean }> {
    try {
      const organizationIds = Object.keys(command.data);

      const envKeys = await this.getEnvKeys(organizationIds);

      const mappedProjectData = this.mapProjectKeys(envKeys, command.data);

      const configurationDetails = await this.getVercelProjectsUsecase.getVercelConfiguration(command.environmentId, {
        configurationId: command.configurationId,
        userId: command.userId,
      });

      await this.saveProjectIds(command);

      for (const key of Object.keys(mappedProjectData)) {
        await this.setEnvironments({
          clientKey: mappedProjectData[key].clientKey,
          privateKey: mappedProjectData[key].privateKey,
          projectIds: mappedProjectData[key].projectIds,
          teamId: configurationDetails.teamId,
          token: configurationDetails.accessToken,
        });
      }

      this.analyticsService.track('Create Vercel Integration - [Partner Integrations]', command.userId, {
        _organization: command.organizationId,
      });

      return {
        success: true,
      };
    } catch (error) {
      throw new ApiException(error.message);
    }
  }

  private async getEnvKeys(organizationIds: string[]): Promise<EnvironmentEntity[]> {
    return await this.environmentRepository.find(
      {
        _organizationId: organizationIds,
      },
      'apiKeys identifier _organizationId'
    );
  }

  private mapProjectKeys(envData: EnvironmentEntity[], projectData: Record<string, string[]>) {
    return envData.reduce<Record<string, MapProjectkeys>>((acc, curr) => {
      acc[curr._organizationId] = {
        privateKey: curr.apiKeys[0].key,
        clientKey: curr.identifier,
        projectIds: projectData[curr._organizationId],
      };

      return acc;
    }, {});
  }

  private async setEnvironments({ clientKey, projectIds, privateKey, teamId, token }: ISetEnvironment): Promise<void> {
    const projectApiUrl = `${process.env.VERCEL_BASE_URL}/v9/projects`;
    const target = ['production', 'preview', 'development'];
    const type = 'encrypted';

    const apiKeys = [
      {
        target,
        type,
        value: clientKey,
        key: 'NEXT_PUBLIC_NOVU_CLIENT_APP_ID',
      },
      {
        target,
        type,
        value: clientKey,
        key: 'NOVU_CLIENT_APP_ID',
      },
      {
        target,
        type,
        value: privateKey,
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

  private async saveProjectIds(command: CompleteVercelIntegrationCommand) {
    await this.organizationRepository.bulkUpdatePartnerConfiguration(
      command.userId,
      command.data,
      command.configurationId
    );
  }
}
