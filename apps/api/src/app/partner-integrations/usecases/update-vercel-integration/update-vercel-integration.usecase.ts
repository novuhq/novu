import { HttpService } from '@nestjs/axios';
import { BadRequestException, Injectable } from '@nestjs/common';
import { AnalyticsService, decryptApiKey, PinoLogger } from '@novu/application-generic';
import { EnvironmentEntity, EnvironmentRepository, OrganizationRepository } from '@novu/dal';
import { lastValueFrom } from 'rxjs';
import { VercelBridgeSyncService } from '../../services/vercel-bridge-sync.service';
import { SyncVercelBridgeCommand } from '../sync-vercel-bridge/sync-vercel-bridge.command';
import { SyncVercelBridge } from '../sync-vercel-bridge/sync-vercel-bridge.usecase';
import { UpdateVercelIntegrationCommand } from './update-vercel-integration.command';

interface ISetEnvironment {
  name: string;
  token: string;
  projectIds: string[];
  teamId: string | null;
  applicationIdentifier: string;
  privateKey: string;
}

interface IRemoveEnvironment {
  token: string;
  teamId: string | null;
  userId: string;
  configurationId: string;
  vercelTargets: Array<'production' | 'development'>;
}

type ProjectDetails = {
  projectId: string;
  vercelTarget: 'production' | 'development';
  clientAppIdEnv?: string;
  secretKeyEnv?: string;
  nextClientAppIdEnv?: string;
  nextApplicationIdentifierEnv?: string;
};

@Injectable()
export class UpdateVercelIntegration {
  constructor(
    private httpService: HttpService,
    private organizationRepository: OrganizationRepository,
    private environmentRepository: EnvironmentRepository,
    private syncVercelBridge: SyncVercelBridge,
    private vercelBridgeSyncService: VercelBridgeSyncService,
    private analyticsService: AnalyticsService,
    private logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  async execute(command: UpdateVercelIntegrationCommand): Promise<{ success: boolean }> {
    try {
      const { userId, organizationId, configurationId, data: orgIdsToProjectIds } = command;

      const configuration = await this.getCurrentOrgPartnerConfiguration({
        userId,
        configurationId,
      });

      const organizationIds = Object.keys(orgIdsToProjectIds);
      const environments = await this.getEnvironments(organizationIds);
      const vercelTargets = [
        ...new Set(
          environments.map((env) => (env.name.toLowerCase() === 'production' ? 'production' : 'development'))
        ),
      ];

      await this.removeEnvVariablesFromProjects({
        teamId: configuration.teamId,
        token: configuration.accessToken,
        userId,
        configurationId,
        vercelTargets,
      });

      await this.organizationRepository.bulkUpdatePartnerConfiguration({
        userId,
        data: orgIdsToProjectIds,
        configuration,
      });

      for (const env of environments) {
        const projectIds = orgIdsToProjectIds[env._organizationId];
        await this.setEnvVariablesOnProjects({
          name: env.name,
          applicationIdentifier: env.identifier,
          privateKey: decryptApiKey(env.apiKeys[0].key),
          projectIds,
          teamId: configuration.teamId,
          token: configuration.accessToken,
        });

        try {
          await this.updateBridgeUrl(
            env._id,
            env.name,
            projectIds[0],
            configuration.accessToken,
            configuration.teamId,
            env._organizationId
          );
        } catch (error) {
          this.logger.error({ err: error }, 'Error updating bridge url');
        }
      }

      this.analyticsService.track('Update Vercel Integration - [Partner Integrations]', userId, {
        _organization: organizationId,
      });

      return { success: true };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  private async updateBridgeUrl(
    environmentId: string,
    environmentName: string,
    projectId: string,
    accessToken: string,
    teamId: string | null,
    organizationId: string
  ) {
    const isProduction = environmentName.toLowerCase() === 'production';
    const bridgeUrl = await this.vercelBridgeSyncService.resolveBridgeUrl({
      isProduction,
      environmentName,
      projectId,
      teamId,
      accessToken,
      requireStableAlias: true,
    });

    if (!bridgeUrl) {
      return;
    }

    const userId = await this.vercelBridgeSyncService.resolveSyncUserId(organizationId);

    await this.syncVercelBridge.execute(
      SyncVercelBridgeCommand.create({
        organizationId,
        userId,
        environmentId,
        bridgeUrl,
        isProduction,
      })
    );
  }

  private async getEnvironments(organizationIds: string[]): Promise<EnvironmentEntity[]> {
    return await this.environmentRepository.find(
      {
        _organizationId: { $in: organizationIds },
      },
      'apiKeys identifier name _organizationId _id'
    );
  }

  private async setEnvVariablesOnProjects({
    name,
    applicationIdentifier,
    projectIds,
    privateKey,
    teamId,
    token,
  }: ISetEnvironment): Promise<void> {
    const target = name?.toLowerCase() === 'production' ? ['production'] : ['preview', 'development'];
    const type = 'encrypted';

    const environmentVariables = [
      {
        target,
        type,
        value: applicationIdentifier,
        key: 'NEXT_PUBLIC_NOVU_CLIENT_APP_ID',
        legacy: true,
      },
      {
        target,
        type,
        value: applicationIdentifier,
        key: 'NOVU_CLIENT_APP_ID',
        legacy: true,
      },
      {
        target,
        type,
        value: applicationIdentifier,
        key: 'NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER',
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

    const setEnvVariable = async (projectId: string, variable: (typeof environmentVariables)[0]) => {
      if (variable.legacy) {
        return;
      }

      try {
        const queryParams = new URLSearchParams();
        queryParams.set('upsert', 'true');

        if (teamId) {
          queryParams.set('teamId', teamId);
        }

        await lastValueFrom(
          this.httpService.post(
            `${process.env.VERCEL_BASE_URL}/v10/projects/${projectId}/env?${queryParams.toString()}`,
            [variable],
            { headers }
          )
        );
      } catch (error) {
        throw new BadRequestException(error.response?.data?.error || error.response?.data);
      }
    };

    await Promise.all(
      projectIds.flatMap((projectId) => environmentVariables.map((variable) => setEnvVariable(projectId, variable)))
    );
  }

  async getCurrentOrgPartnerConfiguration({ userId, configurationId }: { userId: string; configurationId: string }) {
    const orgsWithIntegration = await this.organizationRepository.findByPartnerConfigurationId({
      userId,
      configurationId,
    });

    if (orgsWithIntegration.length === 0) {
      throw new BadRequestException({
        message: 'No partner configuration found.',
        type: 'vercel',
      });
    }

    const firstOrg = orgsWithIntegration[0];
    const configuration = firstOrg.partnerConfigurations?.find((config) => config.configurationId === configurationId);
    if (!firstOrg.partnerConfigurations?.length || !configuration) {
      throw new BadRequestException({
        message: 'No partner configuration found.',
        type: 'vercel',
      });
    }

    return configuration;
  }

  private async getVercelLinkedProjects(
    accessToken: string,
    teamId: string | null,
    projectIds: string[]
  ): Promise<ProjectDetails[]> {
    const response = await lastValueFrom(
      this.httpService.get(`${process.env.VERCEL_BASE_URL}/v4/projects${teamId ? `?teamId=${teamId}` : ''}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })
    );
    const vercelProjects = response.data.projects as any[];
    const filteredVercelProjects = vercelProjects.filter((project) => projectIds.includes(project.id));

    return ['production', 'development'].flatMap((vercelEnvironment) =>
      filteredVercelProjects.map<ProjectDetails>((project) => {
        const { id } = project;
        const vercelEnvs = project?.env;
        const nextApplicationIdentifierEnv = vercelEnvs?.find(
          (e) => e.key === 'NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER' && e.target.includes(vercelEnvironment)
        );
        // Legacy env variable for existing Vercel integrations
        const nextClientAppIdEnv = vercelEnvs?.find(
          (e) => e.key === 'NEXT_PUBLIC_NOVU_CLIENT_APP_ID' && e.target.includes(vercelEnvironment)
        );
        // Legacy env variable for existing Vercel integrations
        const clientAppIdEnv = vercelEnvs?.find(
          (e) => e.key === 'NOVU_CLIENT_APP_ID' && e.target.includes(vercelEnvironment)
        );
        const secretKeyEnv = vercelEnvs?.find(
          (e) => e.key === 'NOVU_SECRET_KEY' && e.target.includes(vercelEnvironment)
        );

        return {
          projectId: id,
          vercelTarget: vercelEnvironment as 'production' | 'development',
          clientAppIdEnv: clientAppIdEnv?.id,
          secretKeyEnv: secretKeyEnv?.id,
          nextClientAppIdEnv: nextClientAppIdEnv?.id,
          nextApplicationIdentifierEnv: nextApplicationIdentifierEnv?.id,
        };
      })
    );
  }

  private async removeEnvVariablesFromProjects({
    teamId,
    token,
    userId,
    configurationId,
    vercelTargets,
  }: IRemoveEnvironment): Promise<void> {
    const orgsWithIntegration = await this.organizationRepository.findByPartnerConfigurationId({
      userId,
      configurationId,
    });

    const allOldProjectIds = [
      ...new Set(
        orgsWithIntegration.reduce<string[]>((acc, org) => {
          return acc.concat(org.partnerConfigurations?.[0].projectIds || []);
        }, [])
      ),
    ];

    if (allOldProjectIds.length === 0) {
      return;
    }

    const vercelLinkedProjects = await this.getVercelLinkedProjects(token, teamId, allOldProjectIds);
    const targetsToRemove = new Set(vercelTargets);
    const filteredProjects = vercelLinkedProjects.filter((detail) => targetsToRemove.has(detail.vercelTarget));

    const projectApiUrl = `${process.env.VERCEL_BASE_URL}/v9/projects`;

    await Promise.all(
      filteredProjects.map((detail) => {
        const urls: string[] = [];
        if (detail.nextApplicationIdentifierEnv) {
          urls.push(
            `${projectApiUrl}/${detail.projectId}/env/${detail.nextApplicationIdentifierEnv}${teamId ? `?teamId=${teamId}` : ''}`
          );
        }

        if (detail.nextClientAppIdEnv) {
          urls.push(
            `${projectApiUrl}/${detail.projectId}/env/${detail.nextClientAppIdEnv}${teamId ? `?teamId=${teamId}` : ''}`
          );
        }

        if (detail.clientAppIdEnv) {
          urls.push(
            `${projectApiUrl}/${detail.projectId}/env/${detail.clientAppIdEnv}${teamId ? `?teamId=${teamId}` : ''}`
          );
        }

        if (detail.secretKeyEnv) {
          urls.push(
            `${projectApiUrl}/${detail.projectId}/env/${detail.secretKeyEnv}${teamId ? `?teamId=${teamId}` : ''}`
          );
        }

        const uniqueUrls = [...new Set(urls)];
        const requests = uniqueUrls.map((url) =>
          lastValueFrom(
            this.httpService.delete(url, {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            })
          )
        );

        return Promise.all(requests);
      })
    );
  }
}
