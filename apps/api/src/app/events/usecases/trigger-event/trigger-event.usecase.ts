import { Injectable } from '@nestjs/common';

import * as Sentry from '@sentry/node';

import { TriggerEventCommand } from './trigger-event.command';
import { ProcessSubscriber } from '../process-subscriber/process-subscriber.usecase';
import { ProcessSubscriberCommand } from '../process-subscriber/process-subscriber.command';

import { EventsPerformanceService } from '../../services/performance-service';

import { ProcessNotification } from '../process-notification/process-notification.usecase';
import { ProcessNotificationCommand } from '../process-notification/process-notification.command';

@Injectable()
export class TriggerEvent {
  constructor(
    private processSubscriber: ProcessSubscriber,
    protected performanceService: EventsPerformanceService,
    private processNotification: ProcessNotification
  ) {}

  async execute(command: TriggerEventCommand) {
    const mark = this.performanceService.buildTriggerEventMark(command.identifier, command.transactionId);

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

      if (!subscriberProcessed) continue; //Skipping the job
      await this.processNotification.execute(
        ProcessNotificationCommand.create({
          environmentId,
          organizationId,
          identifier: command.identifier,
          payload: command.payload,
          overrides: command.overrides,
          subscriber: subscriberProcessed,
          transactionId: command.transactionId,
          userId,
          ...(actor && actorProcessed && { actor: actorProcessed }),
        })
      );
    }
    this.performanceService.setEnd(mark);
  }
}
