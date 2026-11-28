import { HttpService } from '@nestjs/axios';
import { BadRequestException, Injectable } from '@nestjs/common';
import { OrganizationRepository } from '@novu/dal';
import { lastValueFrom } from 'rxjs';

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
        organizationId: command.organizationId,
        configurationId: command.configurationId,
      });

      if (!configuration || !configuration.accessToken) {
        throw new BadRequestException({
          message: 'No partner configuration found.',
          type: 'vercel',
        });
      }

      const projects = await this.getVercelProjects(configuration.accessToken, configuration.teamId, command.nextPage);

      return projects;
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async getCurrentOrgPartnerConfiguration({
    userId,
    organizationId,
    configurationId,
  }: {
    userId: string;
    organizationId: string;
    configurationId: string;
  }) {
    const orgsWithIntegration = await this.organizationRepository.findByPartnerConfigurationId({
      userId,
      configurationId,
    });

    // Only use a configuration that belongs to the organization the user is authenticated against.
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

  private async getVercelProjects(accessToken: string, teamId: string | null, until?: string) {
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

    return { projects: this.mapProjects(response.data.projects), pagination: response.data.pagination };
  }

  private mapProjects(projects) {
    return projects.map((project) => {
      return {
        name: project.name,
        id: project.id,
      };
    });
  }
}
