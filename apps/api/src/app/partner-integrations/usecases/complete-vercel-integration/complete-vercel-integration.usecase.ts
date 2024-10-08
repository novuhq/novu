import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { catchError, lastValueFrom } from 'rxjs';
import {
  CommunityUserRepository,
  EnvironmentEntity,
  EnvironmentRepository,
  MemberRepository,
  OrganizationRepository,
} from '@novu/dal';
import { AnalyticsService, decryptApiKey } from '@novu/application-generic';

import { CompleteVercelIntegrationCommand } from './complete-vercel-integration.command';
import { GetVercelProjects } from '../get-vercel-projects/get-vercel-projects.usecase';
import { ApiException } from '../../../shared/exceptions/api.exception';
import { Sync } from '../../../bridge/usecases/sync';

interface ISetEnvironment {
  name: string;
  envId: string;
  token: string;
  projectIds: string[];
  teamId: string | null;
  clientKey: string;
  privateKey: string;
}

@Injectable()
export class CompleteVercelIntegration {
  constructor(
    private httpService: HttpService,
    private environmentRepository: EnvironmentRepository,
    private getVercelProjectsUsecase: GetVercelProjects,
    private organizationRepository: OrganizationRepository,
    private analyticsService: AnalyticsService,
    private syncUsecase: Sync,
    private memberRepository: MemberRepository,
    private communityUserRepository: CommunityUserRepository
  ) {}

  async execute(command: CompleteVercelIntegrationCommand): Promise<{ success: boolean }> {
    try {
      const organizationIdsMap = Object.keys(command.data);
      const organizationIds: string[] = [];
      const internalOrgMap = {};
      for (const orgId of organizationIdsMap) {
        const internalOrg = await this.organizationRepository.findById(orgId);
        if (internalOrg) {
          organizationIds.push(internalOrg._id);

          internalOrgMap[internalOrg._id] = command.data[orgId];
        }
      }

      const envKeys = await this.getEnvKeys(organizationIds);

      const mappedProjectData = this.mapProjectKeys(envKeys, internalOrgMap);

      const configurationDetails = await this.getVercelProjectsUsecase.getVercelConfiguration(command.environmentId, {
        configurationId: command.configurationId,
        userId: command.userId,
      });

      await this.saveProjectIds(command);

      for (const env of mappedProjectData) {
        await this.setEnvironments({
          name: env.name,
          envId: env.envId,
          clientKey: env.clientKey,
          privateKey: env.privateKey,
          projectIds: env.projectIds,
          teamId: configurationDetails.teamId,
          token: configurationDetails.accessToken,
        });

        try {
          await this.updateBridgeUrl(
            env.envId,
            env.projectIds[0],
            configurationDetails.accessToken,
            configurationDetails.teamId,
            env._organizationId
          );
        } catch (error) {
          Logger.error(error, 'Error updating bridge url');
        }
      }

      this.analyticsService.track('Create Vercel Integration - [Partner Integrations]', command.userId, {
        _organization: command.organizationId,
      });

      return {
        success: true,
      };
    } catch (error) {
      Logger.error(error);
      throw new ApiException(error.message);
    }
  }

  private async updateBridgeUrl(
    environmentId: string,
    projectIds: string,
    accessToken: string,
    teamId: string,
    organizationId: string
  ) {
    try {
      const getDomainsResponse = await lastValueFrom(
        this.httpService.get(`${process.env.VERCEL_BASE_URL}/v9/projects/${projectIds}?teamId=${teamId}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        })
      );

      const production = getDomainsResponse.data?.targets?.production;
      const bridgeUrl = production?.meta?.branchAlias || production?.automaticAliases[0];

      if (!bridgeUrl) {
        return;
      }

      const fullBridgeUrl = `https://${bridgeUrl}/api/novu`;

      const orgAdmin = await this.memberRepository.getOrganizationAdminAccount(organizationId);
      if (!orgAdmin) {
        throw new ApiException('Organization admin not found');
      }

      const internalUser = await this.communityUserRepository.findOne({ externalId: orgAdmin?._userId });

      if (!internalUser) {
        throw new ApiException('User not found');
      }

      await this.syncUsecase.execute({
        organizationId,
        userId: internalUser?._id as string,
        environmentId,
        bridgeUrl: fullBridgeUrl,
        source: 'vercel',
      });
    } catch (error) {
      Logger.error(error, 'Error updating bridge url');
    }
  }

  private async getEnvKeys(organizationIds: string[]): Promise<EnvironmentEntity[]> {
    return await this.environmentRepository.find(
      {
        _organizationId: { $in: organizationIds },
      },
      'apiKeys identifier name _organizationId _id'
    );
  }

  private mapProjectKeys(envData: EnvironmentEntity[], projectData: Record<string, string[]>) {
    const result: {
      _organizationId: string;
      name: string;
      envId: string;
      projectIds: string[];
      privateKey: string;
      clientKey: string;
    }[] = [];

    for (const env of envData) {
      result.push({
        _organizationId: env._organizationId,
        name: env.name,
        envId: env._id,
        projectIds: projectData[env._organizationId],
        privateKey: decryptApiKey(env.apiKeys[0].key),
        clientKey: env.identifier,
      });
    }

    return result;
  }

  private async setEnvironments({
    name,
    envId,
    clientKey,
    projectIds,
    privateKey,
    teamId,
    token,
  }: ISetEnvironment): Promise<void> {
    const target = name?.toLowerCase() === 'production' ? ['production'] : ['preview', 'development'];
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
        key: 'NOVU_SECRET_KEY',
      },
    ];

    const headers = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    const getUrl = (projectId: string) => {
      const projectApiUrl = `${process.env.VERCEL_BASE_URL}/v10/projects`;
      const baseUrl = `${projectApiUrl}/${projectId}/env`;
      const teamIdParam = teamId ? `teamId=${teamId}` : '';

      return `${baseUrl}?upsert=true&${teamIdParam}`;
    };

    const createEnvVariable = async (projectId: string, apiKey: (typeof apiKeys)[0]) => {
      return lastValueFrom(this.httpService.post(getUrl(projectId), [apiKey], { headers }));
    };

    const setEnvVariable = async (projectId: string, apiKey: (typeof apiKeys)[0]) => {
      try {
        await createEnvVariable(projectId, apiKey);
      } catch (error) {
        console.error('Error setting environment variable:', error.response?.data?.error || error.response?.data);
        throw error;
      }
    };

    await Promise.all(projectIds.flatMap((projectId) => apiKeys.map((apiKey) => setEnvVariable(projectId, apiKey))));
  }

  private async saveProjectIds(command: CompleteVercelIntegrationCommand) {
    await this.organizationRepository.bulkUpdatePartnerConfiguration(
      command.userId,
      command.data,
      command.configurationId
    );
  }
}
