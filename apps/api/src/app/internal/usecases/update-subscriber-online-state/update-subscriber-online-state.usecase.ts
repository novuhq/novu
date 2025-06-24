import { Injectable } from '@nestjs/common';
import { PinoLogger } from '@novu/application-generic';
import { UpdateSubscriberOnlineStateCommand } from './update-subscriber-online-state.command';

@Injectable()
export class UpdateSubscriberOnlineState {
  constructor(private readonly logger: PinoLogger) {
    this.logger.setContext(UpdateSubscriberOnlineState.name);
  }

  async execute(command: UpdateSubscriberOnlineStateCommand): Promise<{ success: boolean; message?: string }> {
    this.logger.info(
      `Updating subscriber online state: ${command.subscriberId} in environment ${command.environmentId} to ${command.isOnline}`
    );

    try {
      /*
       * Here you can add your business logic for handling subscriber online state
       * For example:
       * - Update subscriber status in database
       * - Trigger events or notifications
       * - Update analytics or metrics
       * - Send notifications to other services
       */

      // For now, we'll just log the event
      this.logger.info(
        `Subscriber ${command.subscriberId} is now ${command.isOnline ? 'online' : 'offline'} in environment ${command.environmentId}`
      );

      return {
        success: true,
        message: 'Subscriber online state updated successfully',
      };
    } catch (error) {
      this.logger.error(
        `Failed to update subscriber online state for ${command.subscriberId}: ${error.message}`,
        error.stack
      );

      throw error;
    }
  }
}
