import { faker } from '@faker-js/faker';
import { EnvironmentRepository } from '@novu/dal';

export class EnvironmentService {
  private environmentRepository = new EnvironmentRepository();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async createEnvironment(organizationId: any) {
    const project = await this.environmentRepository.create({
      name: faker.name.title(),
      _organizationId: organizationId,
    });

    return project;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getEnvironment(environmentId: any) {
    const environment = await this.environmentRepository.findOne({
      _id: environmentId,
    });

    return environment;
  }
}
