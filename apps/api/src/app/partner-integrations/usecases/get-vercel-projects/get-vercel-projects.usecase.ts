import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import { OrganizationRepository } from '@novu/dal';
import { ApiException } from '../../../shared/exceptions/api.exception';
import { GetVercelProjectsCommand } from './get-vercel-projects.command';

interface IGetVercelConfiguration {
  userId: string;
  configurationId: string;
}

@Injectable()
export class GetVercelProjects {
  constructor(private httpService: HttpService, private organizationRepository: OrganizationRepository) {}

  async execute(command: GetVercelProjectsCommand) {
    const configuration = await this.getVercelConfiguration(command.environmentId, {
      configurationId: command.configurationId,
      userId: command.userId,
    });

    if (!configuration.accessToken) {
      throw new ApiException();
    }

    const projects = await this.getVercelProjects(configuration.accessToken, configuration.teamId);

    return projects;
  }

  async getVercelConfiguration(environmentId: string, payload: IGetVercelConfiguration) {
    const organization = await this.organizationRepository.findPartnerConfigurationDetails(
      environmentId,
      payload.userId,
      payload.configurationId
    );

    return {
      accessToken: organization[0].partnerConfigurations[0].accessToken,
      teamId: organization[0].partnerConfigurations[0].teamId,
    };
  }

  private async getVercelProjects(accessToken: string, teamId: string | null) {
    const response = await lastValueFrom(
      this.httpService.get(`${process.env.VERCEL_BASE_URL}/v4/projects${teamId ? `?teamId=${teamId}` : ''}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })
    );

    return this.mapProjects(response.data.projects);
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
