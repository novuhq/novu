import { faker } from '@faker-js/faker';
import { EnvironmentEntity, EnvironmentRepository, LayoutRepository, NotificationGroupRepository } from '@novu/dal';
import { createHash } from 'crypto';

export class EnvironmentService {
  constructor() {}

  private async createEnvironment(
    organizationId: string,
    userId: string,
    name?: string,
    parentId?: string
  ): Promise<EnvironmentEntity> {
    const environmentRepository = new EnvironmentRepository();

    const key = faker.string.uuid();
    const hashedApiKey = createHash('sha256').update(key).digest('hex');

    return await environmentRepository.create({
      identifier: faker.string.uuid(),
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

  private async createEnvironmentAndDependencies({
    name,
    parentId,
    organizationId,
    userId,
  }: {
    name: string;
    parentId?: string;
    organizationId: string;
    userId: string;
  }): Promise<EnvironmentEntity> {
    const notificationGroupRepository = new NotificationGroupRepository();
    const layoutRepository = new LayoutRepository();

    const environment = await this.createEnvironment(organizationId, userId, name, parentId);

    let parentGroup;

    if (parentId) {
      parentGroup = await notificationGroupRepository.findOne({
        _environmentId: parentId,
        _organizationId: organizationId,
      });
    }

    await notificationGroupRepository.create({
      name: 'General',
      _environmentId: environment._id,
      _organizationId: organizationId,
      _parentId: parentGroup?._id,
    });

    await layoutRepository.create({
      name: 'Default',
      identifier: 'default-layout',
      _environmentId: environment._id,
      _organizationId: organizationId,
      isDefault: true,
    });

    return environment;
  }

  async createDevAndProdEnvironments({ organizationId, userId }: { organizationId: string; userId: string }) {
    const development = await this.createEnvironmentAndDependencies({
      name: 'Development',
      organizationId,
      userId,
    });
    const production = await this.createEnvironmentAndDependencies({
      name: 'Production',
      parentId: development._id,
      organizationId,
      userId,
    });

    return { development, production };
  }
}
