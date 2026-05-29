import { Injectable } from '@nestjs/common';

import { CreateApiKeyCredentialResponseDto } from '../../dtos';
import { CreateApiKeyCredential } from '../create-api-key-credential/create-api-key-credential.usecase';
import { CreateApiKeyCredentialCommand } from '../create-api-key-credential/create-api-key-credential.command';
import { RevokeApiKeyCredential } from '../revoke-api-key-credential/revoke-api-key-credential.usecase';
import { RevokeApiKeyCredentialCommand } from '../revoke-api-key-credential/revoke-api-key-credential.command';
import { RotateApiKeyCredentialCommand } from './rotate-api-key-credential.command';

@Injectable()
export class RotateApiKeyCredential {
  constructor(
    private readonly revokeApiKeyCredential: RevokeApiKeyCredential,
    private readonly createApiKeyCredential: CreateApiKeyCredential
  ) {}

  async execute(command: RotateApiKeyCredentialCommand): Promise<CreateApiKeyCredentialResponseDto> {
    await this.revokeApiKeyCredential.execute(
      RevokeApiKeyCredentialCommand.create({
        organizationId: command.organizationId,
        userId: command.userId,
        serviceAccountId: command.serviceAccountId,
        apiKeyId: command.apiKeyId,
      })
    );

    return this.createApiKeyCredential.execute(
      CreateApiKeyCredentialCommand.create({
        organizationId: command.organizationId,
        userId: command.userId,
        serviceAccountId: command.serviceAccountId,
        expiresAt: command.expiresAt,
      })
    );
  }
}
