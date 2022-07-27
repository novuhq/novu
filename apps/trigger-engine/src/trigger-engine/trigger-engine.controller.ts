import { Body, Controller, Delete, Param, Post, UseGuards } from '@nestjs/common';
import { TriggerEvent, TriggerEventCommand } from './usecases/trigger-event';
import { TriggerEventDto } from './dto/trigger-event.dto';
import { ISubscribersDefine } from '@novu/node';
import { MessagePattern } from '@nestjs/microservices';

@Controller()
export class TriggerEngineController {
  constructor(private triggerEvent: TriggerEvent) {}

  @MessagePattern('trigger_event')
  processTrigger(job) {
    const mappedSubscribers = this.mapSubscribers(job);

    return this.triggerEvent.execute(
      TriggerEventCommand.create({
        userId: job.userId,
        environmentId: job.environmentId,
        organizationId: job.organizationId,
        identifier: job.identifier,
        payload: job.payload,
        to: mappedSubscribers,
        transactionId: job.transactionId,
      })
    );
  }

  private mapSubscribers(body: TriggerEventDto): ISubscribersDefine[] {
    const subscribers = Array.isArray(body.to) ? body.to : [body.to];

    return subscribers.map((subscriber) => {
      if (typeof subscriber === 'string') {
        return {
          subscriberId: subscriber,
        };
      } else {
        return subscriber;
      }
    });
  }
}
