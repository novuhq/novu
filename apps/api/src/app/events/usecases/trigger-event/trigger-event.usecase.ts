import { Injectable } from '@nestjs/common';

import * as Sentry from '@sentry/node';

import { TriggerEventCommand } from './trigger-event.command';
import { ProcessSubscriber } from '../process-subscriber/process-subscriber.usecase';
import { ProcessSubscriberCommand } from '../process-subscriber/process-subscriber.command';
import { ProcessNotification } from '../process-notification/process-notification.usecase';
import { ProcessNotificationCommand } from '../process-notification/process-notification.command';

@Injectable()
export class TriggerEvent {
  constructor(private processSubscriber: ProcessSubscriber, private processNotification: ProcessNotification) {}

  async execute(command: TriggerEventCommand) {
    const { actor, environmentId, transactionId, organizationId, to, userId } = command;

    await this.processNotification.validateTransactionIdProperty(transactionId, organizationId, environmentId);

    Sentry.addBreadcrumb({
      message: 'Sending trigger',
      data: {
        triggerIdentifier: command.identifier,
      },
    });

    // We might have a single actor for every trigger so we only need to check for it once
    let actorProcessed;
    if (actor) {
      actorProcessed = await this.processSubscriber.execute(
        ProcessSubscriberCommand.create({
          environmentId,
          organizationId,
          userId,
          subscriber: actor,
        })
      );
    }

    for (const subscriber of to) {
      const subscriberProcessed = await this.processSubscriber.execute(
        ProcessSubscriberCommand.create({
          environmentId,
          organizationId,
          userId,
          subscriber,
        })
      );

      if (!subscriber) continue; //Skipping the job
      await this.processNotification.execute(
        ProcessNotificationCommand.create({
          identifier: command.identifier,
          payload: command.payload,
          overrides: command.overrides,
          subscriber: subscriberProcessed,
          transactionId: command.transactionId,
          environmentId: command.environmentId,
          organizationId: command.organizationId,
          userId: command.organizationId,
          actorSubscriber: actorProcessed,
        })
      );
    }
  }
}
