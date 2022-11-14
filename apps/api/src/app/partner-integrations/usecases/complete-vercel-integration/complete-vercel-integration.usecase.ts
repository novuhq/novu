import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { lastValueFrom } from 'rxjs';
import { EnvironmentRepository, EnvironmentEntity } from '@novu/dal';
import { CompleteVercelIntegrationCommand } from './complete-vercel-integration.command';
import { GetVercelProjects } from '../get-vercel-projects/get-vercel-projects.usecase';

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
    private getVercelProjectsUsecase: GetVercelProjects
  ) {}

  async execute(command: CompleteVercelIntegrationCommand): Promise<{ success: boolean }> {
    const organizationIds = Object.keys(command.data);

    const envKeys = await this.getEnvKeys(organizationIds);

    const mappedProjectData = this.mapProjectKeys(envKeys, command.data);

    const configurationDetails = await this.getVercelProjectsUsecase.getVercelConfiguration(command.environmentId, {
      configurationId: command.configurationId,
      userId: command.userId,
    });

    for (const key of Object.keys(mappedProjectData)) {
      await this.setEnvironments({
        clientKey: mappedProjectData[key].clientKey,
        privateKey: mappedProjectData[key].privateKey,
        projectIds: mappedProjectData[key].projectIds,
        teamId: configurationDetails.teamId,
        token: configurationDetails.accessToken,
      });
    }

    return {
      success: true,
    };
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
    const mappedData = envData.reduce<Record<string, MapProjectkeys>>((acc, curr) => {
      const newData = {
        privateKey: curr.apiKeys[0].key,
        clientKey: curr.identifier,
        projectIds: projectData[curr._organizationId],
      };
      acc[curr._organizationId] = newData;

      return acc;
    }, {});

    return mappedData;
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
}
