import { faker } from '@faker-js/faker';
import { EnvironmentEntity, EnvironmentRepository } from '@novu/dal';
import { IApiRateLimitMaximum } from '@novu/shared';
import { createHash } from 'crypto';
import { v4 as uuid } from 'uuid';

enum EnvironmentsEnum {
  DEVELOPMENT = 'Development',
  PRODUCTION = 'Production',
}

export class EnvironmentService {
  private environmentRepository = new EnvironmentRepository();

  async createEnvironment(
    organizationId: string,
    userId: string,
    name?: string,
    parentId?: string
  ): Promise<EnvironmentEntity> {
    const key = uuid();
    const hashedApiKey = createHash('sha256').update(key).digest('hex');

    return await this.environmentRepository.create({
      identifier: uuid(),
      name: name ?? faker.name.jobTitle(),
      _organizationId: organizationId,
      ...(parentId && { _parentId: parentId }),
      apiKeys: [
        {
          key,
          _userId: userId,
          hash: hashedApiKey,
        },
      ],
    });
  }

  async createDevelopmentEnvironment(organizationId: string, userId: string): Promise<EnvironmentEntity> {
    return await this.createEnvironment(organizationId, userId, EnvironmentsEnum.DEVELOPMENT);
  }

  async createProductionEnvironment(
    organizationId: string,
    userId: string,
    parentId: string
  ): Promise<EnvironmentEntity> {
    return await this.createEnvironment(organizationId, userId, EnvironmentsEnum.PRODUCTION, parentId);
  }

  async enableEnvironmentHmac(environment: EnvironmentEntity) {
    return await this.environmentRepository.update(
      {
        _organizationId: environment._organizationId,
        _id: environment._id,
      },
      { $set: { 'widget.notificationCenterEncryption': true } }
    );
  }

  async getEnvironment(environmentId: string): Promise<EnvironmentEntity | undefined> {
    const environment = await this.environmentRepository.findOne({
      _id: environmentId,
    });

    if (!environment) {
      return;
    }

    return environment;
  }

  async getEnvironmentByNameAndOrganization(
    organizationId: string,
    name: string
  ): Promise<EnvironmentEntity | undefined> {
    const environment = await this.environmentRepository.findOne({
      name,
      _organizationId: organizationId,
    });

    if (!environment) {
      return;
    }

    return environment;
  }

  async getEnvironments(organizationId: string): Promise<EnvironmentEntity[]> {
    return await this.environmentRepository.findOrganizationEnvironments(organizationId);
  }

  async getDevelopmentEnvironment(organizationId: string): Promise<EnvironmentEntity | undefined> {
    return await this.getEnvironmentByNameAndOrganization(organizationId, EnvironmentsEnum.DEVELOPMENT);
  }

  async getProductionEnvironment(organizationId: string): Promise<EnvironmentEntity | undefined> {
    return await this.getEnvironmentByNameAndOrganization(organizationId, EnvironmentsEnum.PRODUCTION);
  }

  async updateApiRateLimits(environmentId: string, apiRateLimits: Partial<IApiRateLimitMaximum>) {
    return await this.environmentRepository.updateApiRateLimits(environmentId, apiRateLimits);
  }
}
