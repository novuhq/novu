import * as faker from 'faker';
import { ApplicationRepository } from '@notifire/dal';

export class ApplicationService {
  private applicationRepository = new ApplicationRepository();

  async createApplication(organizationId: any) {
    const project = await this.applicationRepository.create({
      name: faker.name.title(),
      _organizationId: organizationId,
    });

    return project;
  }
}
