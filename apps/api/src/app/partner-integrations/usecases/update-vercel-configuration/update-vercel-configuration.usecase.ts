import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { lastValueFrom } from 'rxjs';
import { EnvironmentRepository, EnvironmentEntity, OrganizationRepository } from '@novu/dal';
import { GetVercelProjects } from '../get-vercel-projects/get-vercel-projects.usecase';
import { ApiException } from '../../../shared/exceptions/api.exception';
import { UpdateVercelConfigurationCommand } from './update-vercel-configuration.command';

interface IBaseEnvironment {
  token: string;
  teamId: string | null;
  clientKey: string;
  privateKey: string;
}
interface ISetEnvironment extends IBaseEnvironment {
  projectIds: string[];
}

interface IUpdateEnvironment extends IBaseEnvironment {
  projectDetails: ProjectDetails[];
}

type ProjectDetails = {
  projectId: string;
  clientEnvId: string;
  secretEnvId: string;
};

type MappedProjectData = {
  updateProjectDetails: ProjectDetails[];
  addProjectIds: string[];
};

type MapProjectkeys = MappedProjectData & {
  privateKey: string;
  clientKey: string;
};

@Injectable()
export class UpdateVercelConfiguration {
  constructor(
    private httpService: HttpService,
    private environmentRepository: EnvironmentRepository,
    private getVercelProjectsUsecase: GetVercelProjects,
    private organizationRepository: OrganizationRepository
  ) {}

  async execute(command: UpdateVercelConfigurationCommand): Promise<{ success: boolean }> {
    try {
      const organizationIds = Object.keys(command.data);
      const projectIds = Object.keys(command.data).reduce((acc, curr) => {
        return acc.concat(command.data[curr]);
      }, []);

      const envKeys = await this.getEnvKeys(organizationIds);

      const configurationDetails = await this.getVercelProjectsUsecase.getVercelConfiguration(command.environmentId, {
        configurationId: command.configurationId,
        userId: command.userId,
      });

      const { addProjectIds, updateProjectDetails } = await this.getVercelProjects(
        configurationDetails.accessToken,
        configurationDetails.teamId,
        projectIds
      );

      const mappedProjectData = this.mapProjectKeys(envKeys, command.data, { updateProjectDetails, addProjectIds });

      for (const key of Object.keys(mappedProjectData)) {
        await this.setEnvironments({
          clientKey: mappedProjectData[key].clientKey,
          privateKey: mappedProjectData[key].privateKey,
          projectIds: mappedProjectData[key].addProjectIds,
          teamId: configurationDetails.teamId,
          token: configurationDetails.accessToken,
        });
        await this.updateEnvironments({
          clientKey: mappedProjectData[key].clientKey,
          privateKey: mappedProjectData[key].privateKey,
          projectDetails: mappedProjectData[key].updateProjectDetails,
          teamId: configurationDetails.teamId,
          token: configurationDetails.accessToken,
        });
      }

      await this.saveProjectIds(command);

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

  private mapProjectKeys(
    envData: EnvironmentEntity[],
    projectData: Record<string, string[]>,
    projectDetails: MappedProjectData
  ) {
    const { addProjectIds, updateProjectDetails } = projectDetails;
    const mappedData = envData.reduce<Record<string, MapProjectkeys>>((acc, curr) => {
      const projectIds = projectData[curr._organizationId];
      const newData = {
        privateKey: curr.apiKeys[0].key,
        clientKey: curr.identifier,
        updateProjectDetails: updateProjectDetails.filter((detail) => projectIds.includes(detail.projectId)),
        addProjectIds: projectIds.filter((id) => addProjectIds.includes(id)),
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

  private async getVercelProjects(accessToken: string, teamId: string | null, projectIds: string[]) {
    const response = await lastValueFrom(
      this.httpService.get(`${process.env.VERCEL_BASE_URL}/v4/projects${teamId ? `?teamId=${teamId}` : ''}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })
    );

    return this.mapProjects(response.data.projects, projectIds);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapProjects(projects: any[], projectIds: string[]) {
    return projects.reduce<MappedProjectData>(
      (acc, curr) => {
        const id = curr.id;
        if (projectIds.includes(id)) {
          const vercelEnvs = curr?.env;
          const clientEnv = vercelEnvs?.filter((e) => e.key === 'NOVU_CLIENT_APP_ID');
          const secretEnv = vercelEnvs?.filter((e) => e.key === 'NOVU_API_SECRET');

          if (clientEnv.length > 0 && secretEnv.length > 0) {
            acc.updateProjectDetails.push({
              projectId: id,
              clientEnvId: clientEnv[0].id,
              secretEnvId: secretEnv[0].id,
            });
          } else {
            acc.addProjectIds.push(id);
          }
        }

        return acc;
      },
      { updateProjectDetails: [], addProjectIds: [] }
    );
  }

  private async saveProjectIds(command) {
    await this.organizationRepository.bulkUpdatePartnerConfiguration(
      command.userId,
      command.data,
      command.configurationId
    );
  }

  private async updateEnvironments({
    clientKey,
    projectDetails,
    privateKey,
    teamId,
    token,
  }: IUpdateEnvironment): Promise<void> {
    const projectApiUrl = `${process.env.VERCEL_BASE_URL}/v9/projects`;

    await Promise.all(
      projectDetails.map((detail) => {
        const updateClientEnvApiUrl = `${projectApiUrl}/${detail.projectId}/env/${detail.clientEnvId}${
          teamId ? `?teamId=${teamId}` : ''
        }`;

        const updateSecretEnvApiUrl = `${projectApiUrl}/${detail.projectId}/env/${detail.secretEnvId}${
          teamId ? `?teamId=${teamId}` : ''
        }`;

        return Promise.all([
          lastValueFrom(
            this.httpService.patch(
              updateClientEnvApiUrl,
              {
                value: clientKey,
              },
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
              }
            )
          ),
          lastValueFrom(
            this.httpService.patch(
              updateSecretEnvApiUrl,
              {
                value: privateKey,
              },
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
              }
            )
          ),
        ]);
      })
    );
  }
}
