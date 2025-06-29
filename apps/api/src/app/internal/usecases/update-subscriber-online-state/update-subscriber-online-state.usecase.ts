import { Injectable } from '@nestjs/common';
import { PinoLogger } from '@novu/application-generic';
import { SubscriberRepository } from '@novu/dal';
import { UpdateSubscriberOnlineStateCommand } from './update-subscriber-online-state.command';

@Injectable()
export class UpdateSubscriberOnlineState {
  constructor(
    private readonly logger: PinoLogger,
    private readonly subscriberRepository: SubscriberRepository
  ) {
    this.logger.setContext(UpdateSubscriberOnlineState.name);
  }

  async execute(command: UpdateSubscriberOnlineStateCommand): Promise<{ success: boolean; message?: string }> {
    this.logger.info(
      `Updating subscriber online state: ${command.subscriberId} in environment ${command.environmentId} to ${command.isOnline}`
    );

    const updatePayload: { isOnline: boolean; lastOnlineAt?: string } = {
      isOnline: command.isOnline,
      lastOnlineAt: new Date().toISOString(),
    };

    await this.subscriberRepository.update(
      { subscriberId: command.subscriberId, _environmentId: command.environmentId },
      {
        $set: updatePayload,
      }
    );

    this.logger.info(
      `Subscriber ${command.subscriberId} is now ${command.isOnline ? 'online' : 'offline'} in environment ${command.environmentId}`
    );

    return {
      success: true,
      message: 'Subscriber online state updated successfully',
    };
  }
}
