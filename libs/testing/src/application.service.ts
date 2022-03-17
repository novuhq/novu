import { faker } from '@faker-js/faker';
import { ApplicationRepository } from '@notifire/dal';

export class ApplicationService {
  private applicationRepository = new ApplicationRepository();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async createApplication(organizationId: any) {
    const project = await this.applicationRepository.create({
      name: faker.name.title(),
      _organizationId: organizationId,
    });

    return project;
  }
}
