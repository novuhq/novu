import { HttpService } from '@nestjs/axios';
import { BadRequestException, Injectable } from '@nestjs/common';
import { OrganizationRepository } from '@novu/dal';
import { lastValueFrom } from 'rxjs';

import { buildVercelProjectDashboardUrl } from '../../utils/vercel-dashboard-url.util';
import { GetVercelIntegrationProjectsCommand } from './get-vercel-integration-projects.command';

@Injectable()
export class GetVercelIntegrationProjects {
  constructor(
    private httpService: HttpService,
    private organizationRepository: OrganizationRepository
  ) {}

  async execute(command: GetVercelIntegrationProjectsCommand) {
    try {
      const configuration = await this.getCurrentOrgPartnerConfiguration({
        userId: command.userId,
        configurationId: command.configurationId,
      });

      if (!configuration || !configuration.accessToken) {
        throw new BadRequestException({
          message: 'No partner configuration found.',
          type: 'vercel',
        });
      }

      const scopeSlug = await this.getScopeSlug(configuration.accessToken, configuration.teamId);
      const projects = await this.getVercelProjects(
        configuration.accessToken,
        configuration.teamId,
        scopeSlug,
        command.nextPage
      );

      return projects;
    } catch (error) {
      throw new BadRequestException(error.message);
    }
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
        message: 'No partner configuration found',
        type: 'vercel',
      });
    }

    return configuration;
  }

  private async getScopeSlug(accessToken: string, teamId: string | null): Promise<string> {
    if (teamId) {
      const response = await lastValueFrom(
        this.httpService.get(`${process.env.VERCEL_BASE_URL}/v2/teams/${teamId}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        })
      );

      return response.data.slug as string;
    }

    const response = await lastValueFrom(
      this.httpService.get(`${process.env.VERCEL_BASE_URL}/v2/user`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })
    );

    return response.data.user.username as string;
  }

  private async getVercelProjects(accessToken: string, teamId: string | null, scopeSlug: string, until?: string) {
    const queryParams = new URLSearchParams();
    queryParams.set('limit', '100');

    if (teamId) {
      queryParams.set('teamId', teamId);
    }

    if (until) {
      queryParams.set('until', until);
    }

    const response = await lastValueFrom(
      this.httpService.get(`${process.env.VERCEL_BASE_URL}/v10/projects?${queryParams.toString()}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })
    );

    return {
      projects: this.mapProjects(response.data.projects, scopeSlug),
      pagination: response.data.pagination,
    };
  }

  private mapProjects(projects: Array<{ id: string; name: string }>, scopeSlug: string) {
    return projects.map((project) => {
      return {
        name: project.name,
        id: project.id,
        dashboardUrl: buildVercelProjectDashboardUrl(scopeSlug, project.name),
      };
    });
  }
}
