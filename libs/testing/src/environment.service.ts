import { faker } from '@faker-js/faker';
import { EnvironmentRepository, EnvironmentEntity } from '@novu/dal';

export class EnvironmentService {
  private environmentRepository = new EnvironmentRepository();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async createEnvironment(organizationId: any) {
    return await this.environmentRepository.create({
      name: faker.name.jobTitle(),
      _organizationId: organizationId,
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
}
