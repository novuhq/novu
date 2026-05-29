import { Injectable, NotFoundException } from '@nestjs/common';
import { ApiKeyCredentialRepository, ServiceAccountRepository } from '@novu/dal';

import { DeleteServiceAccountCommand } from './delete-service-account.command';

@Injectable()
export class DeleteServiceAccount {
  constructor(
    private readonly serviceAccountRepository: ServiceAccountRepository,
    private readonly apiKeyCredentialRepository: ApiKeyCredentialRepository
  ) {}

  async execute(command: DeleteServiceAccountCommand): Promise<void> {
    const accounts = await this.serviceAccountRepository.listByOrganization(command.organizationId);
    const serviceAccount = accounts.find((entry) => entry._id === command.serviceAccountId);

    if (!serviceAccount) {
      throw new NotFoundException('Service account not found');
    }

    const keys = await this.apiKeyCredentialRepository.listByServiceAccount(
      command.organizationId,
      command.serviceAccountId
    );

    for (const key of keys) {
      if (!key.revokedAt) {
        await this.apiKeyCredentialRepository.update(
          {
            _id: key._id,
            _organizationId: command.organizationId,
          },
          {
            $set: {
              revokedAt: new Date().toISOString(),
            },
          }
        );
      }
    }

    await this.serviceAccountRepository.delete({
      _id: command.serviceAccountId,
      _organizationId: command.organizationId,
    });
  }
}
