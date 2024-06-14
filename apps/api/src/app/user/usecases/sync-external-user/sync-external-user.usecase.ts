import { Injectable } from '@nestjs/common';
import { InstrumentUsecase } from '@novu/application-generic';
import { UserEntity, UserRepository } from '@novu/dal';
import { SyncExternalUserCommand } from './sync-external-user.command';

@Injectable()
export class SyncExternalUser {
  constructor(private readonly userRepository: UserRepository) {}

  @InstrumentUsecase()
  public async execute(command: SyncExternalUserCommand): Promise<UserEntity> {
    return this.userRepository.create({}, { linkOnly: true, externalId: command.userId });
  }
}
