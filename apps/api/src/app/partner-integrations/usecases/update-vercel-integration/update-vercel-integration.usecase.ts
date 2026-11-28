import { HttpService } from '@nestjs/axios';
import { BadRequestException, Injectable } from '@nestjs/common';
import { AnalyticsService, decryptApiKey, PinoLogger } from '@novu/application-generic';
import {
  CommunityUserRepository,
  EnvironmentEntity,
  EnvironmentRepository,
  IPartnerConfiguration,
  MemberRepository,
  OrganizationRepository,
} from '@novu/dal';
import { lastValueFrom } from 'rxjs';
import { Sync } from '../../../bridge/usecases/sync';
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
  previousProjectIds: string[];
}

type VercelProject = {
  id: string;
  env?: { id: string; key: string; target: string[] }[];
};

type ProjectDetails = {
  projectId: string;
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
    private memberRepository: MemberRepository,
    private communityUserRepository: CommunityUserRepository,
    private environmentRepository: EnvironmentRepository,
    private syncUsecase: Sync,
    private analyticsService: AnalyticsService,
    private logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  async execute(command: UpdateVercelIntegrationCommand): Promise<{ success: boolean }> {
    try {
      const { userId, organizationId, configurationId, data: orgIdsToProjectIds } = command;

      this.validateOrganizationsAccess(organizationId, Object.keys(orgIdsToProjectIds));

      const configuration = await this.getCurrentOrgPartnerConfiguration({
        userId,
        organizationId,
        configurationId,
      });

      const requestedProjectIds = orgIdsToProjectIds[organizationId] ?? [];

      await this.validateProjectsNotLinkedToOtherOrganizations({
        organizationId,
        teamId: configuration.teamId,
        projectIds: requestedProjectIds,
      });

      await this.validateProjectsBelongToConfiguration({
        projectIds: requestedProjectIds,
        token: configuration.accessToken,
        teamId: configuration.teamId,
      });

      await this.removeEnvVariablesFromProjects({
        teamId: configuration.teamId,
        token: configuration.accessToken,
        previousProjectIds: configuration.projectIds ?? [],
      });

      await this.updateOrganizationPartnerConfiguration({
        organizationId,
        configuration,
        projectIds: orgIdsToProjectIds[organizationId],
      });

      const organizationIds = Object.keys(orgIdsToProjectIds);
      const environments = await this.getEnvironments(organizationIds);

      for (const env of environments) {
        const projectIds = orgIdsToProjectIds[env._organizationId];
        if (!projectIds?.length) {
          continue;
        }

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
    teamId: string,
    organizationId: string
  ) {
    try {
      const getDomainsResponse = await lastValueFrom(
        this.httpService.get(`${process.env.VERCEL_BASE_URL}/v9/projects/${projectId}?teamId=${teamId}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        })
      );

      const vercelAvailableTargets = getDomainsResponse.data?.targets;
      let vercelTarget;
      if (environmentName.toLowerCase() === 'production') {
        vercelTarget = vercelAvailableTargets?.production;
      } else {
        vercelTarget = vercelAvailableTargets?.development;
      }

      const alias = vercelTarget?.alias?.sort((a, b) => a.length - b.length)[0];
      const bridgeAlias = alias || vercelTarget?.meta?.branchAlias || vercelTarget?.automaticAliases[0];
      if (!bridgeAlias) {
        return;
      }

      const orgOwner = await this.memberRepository.getOrganizationOwnerAccount(organizationId);
      if (!orgOwner) {
        throw new BadRequestException('Organization owner not found');
      }

      const internalUser = await this.communityUserRepository.findOne({ externalId: orgOwner?._userId });
      if (!internalUser) {
        throw new BadRequestException('User not found');
      }

      await this.syncUsecase.execute({
        organizationId,
        userId: internalUser?._id as string,
        environmentId,
        bridgeUrl: `https://${bridgeAlias}/api/novu`,
        source: 'vercel',
      });
    } catch (error) {
      this.logger.error({ err: error }, 'Error updating bridge url');
    }
  }

  private validateOrganizationsAccess(organizationId: string, requestedOrganizationIds: string[]): void {
    const hasUnauthorizedOrganization = requestedOrganizationIds.some(
      (requestedOrganizationId) => requestedOrganizationId !== organizationId
    );

    if (hasUnauthorizedOrganization) {
      throw new BadRequestException('One or more organizations are not accessible.');
    }
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

  async getCurrentOrgPartnerConfiguration({
    userId,
    organizationId,
    configurationId,
  }: {
    userId: string;
    organizationId: string;
    configurationId: string;
  }): Promise<IPartnerConfiguration> {
    const orgsWithIntegration = await this.organizationRepository.findByPartnerConfigurationId({
      userId,
      configurationId,
    });

    // The configuration must belong to the organization the user is authenticated against,
    // not just to any organization the user is a member of.
    const currentOrg = orgsWithIntegration.find((org) => String(org._id) === String(organizationId));
    const configuration = currentOrg?.partnerConfigurations?.find(
      (config) => config.configurationId === configurationId
    );

    if (!configuration) {
      throw new BadRequestException({
        message: 'No partner configuration found.',
        type: 'vercel',
      });
    }

    return configuration;
  }

  private async updateOrganizationPartnerConfiguration({
    organizationId,
    configuration,
    projectIds,
  }: {
    organizationId: string;
    configuration: IPartnerConfiguration;
    projectIds: string[] | undefined;
  }): Promise<void> {
    if (!projectIds) {
      await this.organizationRepository.update(
        { _id: organizationId },
        { $pull: { partnerConfigurations: { teamId: configuration.teamId } } }
      );

      return;
    }

    await this.organizationRepository.upsertPartnerConfiguration({
      organizationId,
      configuration: {
        ...configuration,
        projectIds,
      },
    });
  }

  /**
   * A Vercel project can only hold one organization's Novu keys. Linking a project that another
   * organization already uses would overwrite that organization's keys while both stay linked.
   */
  private async validateProjectsNotLinkedToOtherOrganizations({
    organizationId,
    teamId,
    projectIds,
  }: {
    organizationId: string;
    teamId: string | null;
    projectIds: string[];
  }): Promise<void> {
    if (projectIds.length === 0) {
      return;
    }

    const conflictingOrganization = await this.organizationRepository.findOne(
      {
        _id: { $ne: organizationId },
        partnerConfigurations: {
          $elemMatch: {
            teamId,
            projectIds: { $in: projectIds },
          },
        },
      },
      '_id'
    );

    if (conflictingOrganization) {
      throw new BadRequestException('One or more projects are already linked to another organization.');
    }
  }

  private async validateProjectsBelongToConfiguration({
    projectIds,
    token,
    teamId,
  }: {
    projectIds: string[];
    token: string;
    teamId: string | null;
  }): Promise<void> {
    await Promise.all(
      projectIds.map(async (projectId) => {
        let project: { id?: string; accountId?: string } | undefined;

        try {
          const response = await lastValueFrom(
            this.httpService.get(
              `${process.env.VERCEL_BASE_URL}/v9/projects/${encodeURIComponent(projectId)}${
                teamId ? `?teamId=${encodeURIComponent(teamId)}` : ''
              }`,
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              }
            )
          );
          project = response.data;
        } catch {
          project = undefined;
        }

        const belongsToTeam = !teamId || project?.accountId === teamId;

        if (!project || project.id !== projectId || !belongsToTeam) {
          throw new BadRequestException('One or more projects are not accessible.');
        }
      })
    );
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
    const vercelProjects = response.data.projects as VercelProject[];
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
    previousProjectIds,
  }: IRemoveEnvironment): Promise<void> {
    const allOldProjectIds = [...new Set(previousProjectIds)];

    if (allOldProjectIds.length === 0) {
      return;
    }

    const vercelLinkedProjects = await this.getVercelLinkedProjects(token, teamId, allOldProjectIds);

    const projectApiUrl = `${process.env.VERCEL_BASE_URL}/v9/projects`;

    await Promise.all(
      vercelLinkedProjects.map((detail) => {
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

        const requests = urls.map((url) =>
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
