import { BaseRepository } from '../base-repository';
import { IApiKey, ApplicationEntity } from './application.entity';
import { Application } from './application.schema';

export class ApplicationRepository extends BaseRepository<ApplicationEntity> {
  constructor() {
    super(Application, ApplicationEntity);
  }

  async updateBrandingDetails(applicationId: string, branding: { color: string; logo: string }) {
    return this.update(
      {
        _id: applicationId,
      },
      {
        $set: {
          branding,
        },
      }
    );
  }

  async findApplicationByIdentifier(identifier: string) {
    return await this.findOne({
      identifier,
    });
  }

  async findOrganizationApplications(organizationId: string) {
    return this.find({
      _organizationId: organizationId,
    });
  }

  async addApiKey(applicationId: string, key: string, userId: string) {
    return await this.update(
      {
        _id: applicationId,
      },
      {
        $push: {
          apiKeys: {
            key,
            _userId: userId,
          },
        },
      }
    );
  }

  async findByApiKey(key: string) {
    return await this.findOne({
      'apiKeys.key': key,
    });
  }

  async getApiKeys(applicationId: string): Promise<IApiKey[]> {
    const application = await this.findOne(
      {
        _id: applicationId,
      },
      'apiKeys'
    );
    if (!application) return null;

    return application.apiKeys;
  }
}
