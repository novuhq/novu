import { Injectable } from '@nestjs/common';
import { SupportService } from '@novu/application-generic';
import { capitalize } from '../../shared/services/helper/helper.service';
import { CreateSupportThreadCommand } from './create-thread.command';

@Injectable()
export class CreateSupportThreadUsecase {
  constructor(private supportService: SupportService) {}

  async execute(command: CreateSupportThreadCommand) {
    const firstName = capitalize(command.firstName ?? '');
    const lastName = capitalize(command.lastName ?? '');
    const plainCustomer = await this.supportService.upsertCustomer({
      emailAddress: command.email,
      fullName: `${firstName} ${lastName}`,
      novuUserId: command.userId,
    });

    const thread = await this.supportService.createThread({
      plainCustomerId: plainCustomer.data?.customer?.id,
      threadText: command.text,
    });

    return {
      success: true,
      message: 'Thread created successfully',
      threadId: thread.data?.id,
    };
  }
}
