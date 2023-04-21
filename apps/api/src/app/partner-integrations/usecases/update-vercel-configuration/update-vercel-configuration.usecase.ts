import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { lastValueFrom } from 'rxjs';
import { EnvironmentEntity, EnvironmentRepository, OrganizationRepository } from '@novu/dal';
import { ApiException } from '../../../shared/exceptions/api.exception';
import { GetVercelConfigurationCommand } from '../get-vercel-configuration/get-vercel-configuration.command';
import { GetVercelConfiguration } from '../get-vercel-configuration/get-vercel-configuration.usecase';
import { GetVercelProjects } from '../get-vercel-projects/get-vercel-projects.usecase';
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

interface IRemoveEnvironment {
  removedProjectDetails: ProjectDetails[];
  token: string;
  teamId: string | null;
}

type ProjectDetails = {
  projectId: string;
  clientEnvId: string;
  secretEnvId: string;
};

type NewAndUpdatedProjectData = {
  updateProjectDetails: ProjectDetails[];
  addProjectIds: string[];
};

type AllMappedProjectData = NewAndUpdatedProjectData & {
  removedProjectDetails: ProjectDetails[];
};

type MapProjectkeys = NewAndUpdatedProjectData & {
  privateKey: string;
  clientKey: string;
};

@Injectable()
export class UpdateVercelConfiguration {
  constructor(
    private httpService: HttpService,
    private environmentRepository: EnvironmentRepository,
    private getVercelProjectsUsecase: GetVercelProjects,
    private organizationRepository: OrganizationRepository,
    private getVercelConfigurationUsecase: GetVercelConfiguration
  ) {}

  async execute(command: UpdateVercelConfigurationCommand): Promise<{ success: boolean }> {
    try {
      const organizationIds = Object.keys(command.data);
      const projectIds = Object.keys(command.data).reduce<string[]>((history, current) => {
        if (!command.data[current]) return history;

        return history.concat(command.data[current]);
      }, []);

      const envKeys = await this.getEnvKeys(organizationIds);

      const configurationDetails = await this.getVercelProjectsUsecase.getVercelConfiguration(command.environmentId, {
        configurationId: command.configurationId,
        userId: command.userId,
      });

      const { newAndUpdatedProjectIds, removedProjectIds } = await this.getUpdatedAndRemovedProjectIds(
        command,
        projectIds
      );

      const { addProjectIds, updateProjectDetails, removedProjectDetails } = await this.getVercelProjects(
        configurationDetails.accessToken,
        configurationDetails.teamId,
        newAndUpdatedProjectIds,
        removedProjectIds
      );

      await this.removeEnvironmentVariables({
        removedProjectDetails,
        teamId: configurationDetails.teamId,
        token: configurationDetails.accessToken,
      });

      const mappedProjectData = this.mapProjectKeys(envKeys, command.data, {
        updateProjectDetails,
        addProjectIds,
      });

      for (const key of Object.keys(mappedProjectData)) {
        await this.setEnvironmentVariables({
          clientKey: mappedProjectData[key].clientKey,
          privateKey: mappedProjectData[key].privateKey,
          projectIds: mappedProjectData[key].addProjectIds,
          teamId: configurationDetails.teamId,
          token: configurationDetails.accessToken,
        });
        await this.updateEnvironmentVariables({
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
    projectDetails: NewAndUpdatedProjectData
  ) {
    const { addProjectIds, updateProjectDetails } = projectDetails;

    return envData.reduce<Record<string, MapProjectkeys>>((acc, curr) => {
      const projectIds = projectData[curr._organizationId];
      acc[curr._organizationId] = {
        privateKey: curr.apiKeys[0].key,
        clientKey: curr.identifier,
        updateProjectDetails: updateProjectDetails.filter((detail) => projectIds.includes(detail.projectId)),
        addProjectIds: projectIds.filter((id) => addProjectIds.includes(id)),
      };

      return acc;
    }, {});
  }

  private async setEnvironmentVariables({
    clientKey,
    projectIds,
    privateKey,
    teamId,
    token,
  }: ISetEnvironment): Promise<void> {
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
      {
        target,
        type,
        value: clientKey,
        key: 'NEXT_PUBLIC_NOVU_CLIENT_APP_ID',
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

  private async getVercelProjects(
    accessToken: string,
    teamId: string | null,
    newAndUpdatedProjectIds: string[],
    removedProjectIds: string[]
  ) {
    const response = await lastValueFrom(
      this.httpService.get(`${process.env.VERCEL_BASE_URL}/v4/projects${teamId ? `?teamId=${teamId}` : ''}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })
    );

    return this.mapProjects(response.data.projects, newAndUpdatedProjectIds, removedProjectIds);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapProjects(projects: any[], newAndUpdatedProjectIds: string[], removedProjectIds: string[]) {
    return projects.reduce<AllMappedProjectData>(
      (acc, curr) => {
        const id = curr.id;
        const vercelEnvs = curr?.env;
        const clientEnv = vercelEnvs?.find((e) => e.key === 'NOVU_CLIENT_APP_ID');
        const secretEnv = vercelEnvs?.find((e) => e.key === 'NOVU_API_SECRET');
        if (newAndUpdatedProjectIds.includes(id)) {
          if (clientEnv && secretEnv) {
            acc.updateProjectDetails.push({
              projectId: id,
              clientEnvId: clientEnv.id,
              secretEnvId: secretEnv.id,
            });
          } else {
            acc.addProjectIds.push(id);
          }
        }

        if (removedProjectIds.includes(id)) {
          acc.removedProjectDetails.push({
            projectId: id,
            clientEnvId: clientEnv.id,
            secretEnvId: secretEnv.id,
          });
        }

        return acc;
      },
      { updateProjectDetails: [], addProjectIds: [], removedProjectDetails: [] }
    );
  }

  private async saveProjectIds(command: UpdateVercelConfigurationCommand) {
    await this.organizationRepository.bulkUpdatePartnerConfiguration(
      command.userId,
      command.data,
      command.configurationId
    );
  }

  private async updateEnvironmentVariables({
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

  private async removeEnvironmentVariables({
    removedProjectDetails,
    teamId,
    token,
  }: IRemoveEnvironment): Promise<void> {
    const projectApiUrl = `${process.env.VERCEL_BASE_URL}/v9/projects`;

    await Promise.all(
      removedProjectDetails.map((detail) => {
        const removeClientEnvApiUrl = `${projectApiUrl}/${detail.projectId}/env/${detail.clientEnvId}${
          teamId ? `?teamId=${teamId}` : ''
        }`;

        const removeSecretEnvApiUrl = `${projectApiUrl}/${detail.projectId}/env/${detail.secretEnvId}${
          teamId ? `?teamId=${teamId}` : ''
        }`;

        return Promise.all([
          lastValueFrom(
            this.httpService.delete(removeClientEnvApiUrl, {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            })
          ),
          lastValueFrom(
            this.httpService.delete(removeSecretEnvApiUrl, {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            })
          ),
        ]);
      })
    );
  }

  private async getUpdatedAndRemovedProjectIds(command: UpdateVercelConfigurationCommand, newProjectIds: string[]) {
    const data = await this.getVercelConfigurationUsecase.execute(
      GetVercelConfigurationCommand.create({
        configurationId: command.configurationId,
        environmentId: command.environmentId,
        organizationId: command.organizationId,
        userId: command.userId,
      })
    );
    const oldProjectIds = data.reduce<string[]>((acc, curr) => {
      return acc.concat(curr.projectIds);
    }, []);

    const removedProjectIds = oldProjectIds.filter((projectId) => !newProjectIds.includes(projectId));
    const newAndUpdatedProjectIds = newProjectIds.filter((projectId) => !removedProjectIds.includes(projectId));

    return {
      removedProjectIds,
      newAndUpdatedProjectIds,
    };
  }
}
