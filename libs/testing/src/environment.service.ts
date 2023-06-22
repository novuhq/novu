import { faker } from '@faker-js/faker';
import { EnvironmentRepository, EnvironmentEntity } from '@novu/dal';
import { v4 as uuid } from 'uuid';

export class EnvironmentService {
  private environmentRepository = new EnvironmentRepository();

  async createEnvironment(
    organizationId: string,
    userId: string,
    name?: string,
    parentId?: string
  ): Promise<EnvironmentEntity> {
    return await this.environmentRepository.create({
      identifier: uuid(),
      name: name ?? faker.name.jobTitle(),
      _organizationId: organizationId,
      ...(parentId && { _parentId: parentId }),
      apiKeys: [
        {
          key: uuid(),
          _userId: userId,
        },
      ],
    });
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getEnvironment(environmentId: any) {
    const environment = await this.environmentRepository.findOne({
      _id: environmentId,
    });

    return environment;
  }

  async getProductionEnvironment(organizationId: string) {
    const environment = await this.environmentRepository.findOne({
      _organizationId: organizationId,
      name: 'Production',
    });

    return environment;
  }
}
