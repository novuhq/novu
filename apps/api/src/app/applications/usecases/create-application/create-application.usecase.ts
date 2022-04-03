import { Injectable } from '@nestjs/common';
import { ApplicationRepository } from '@novu/dal';
import * as hat from 'hat';
import { nanoid } from 'nanoid';
import { CreateApplicationCommand } from './create-application.command';

@Injectable()
export class CreateApplication {
  constructor(private applicationRepository: ApplicationRepository) {}

  async execute(command: CreateApplicationCommand) {
    return await this.applicationRepository.create({
      _organizationId: command.organizationId,
      name: command.name,
      identifier: nanoid(12),
      apiKeys: [
        {
          key: hat(),
          _userId: command.userId,
        },
      ],
    });
  }
}
