import { Injectable } from '@nestjs/common';
import { SigningSecretRepository } from '@novu/dal';
import { encryptApiKey, generateSigningSecretValue } from '@novu/application-generic';
import { SigningSecretStatusEnum } from '@novu/shared';

import { CreateSigningSecretResponseDto } from '../../dtos';
import { CreateSigningSecretCommand } from './create-signing-secret.command';

@Injectable()
export class CreateSigningSecret {
  constructor(private readonly signingSecretRepository: SigningSecretRepository) {}

  async execute(command: CreateSigningSecretCommand): Promise<CreateSigningSecretResponseDto> {
    const rawSecret = generateSigningSecretValue();
    const encryptedSecret = encryptApiKey(rawSecret);

    const entity = await this.signingSecretRepository.create({
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
      type: command.type,
      secret: encryptedSecret,
      status: SigningSecretStatusEnum.ACTIVE,
    });

    return {
      _id: entity._id,
      type: entity.type,
      environmentId: entity._environmentId,
      status: entity.status,
      expiresAt: entity.expiresAt,
      createdAt: entity.createdAt,
      secret: rawSecret,
    };
  }
}
