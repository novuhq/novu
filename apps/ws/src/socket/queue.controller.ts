import { Controller, Get } from '@nestjs/common';
import { EventPattern, MessagePattern } from '@nestjs/microservices';
import { QueueService } from '../shared/queue';
import { WSGateway } from './ws.gateway';

@Controller()
export class QueueController {
  constructor(private wsGateway: WSGateway) {}

  @MessagePattern('unseen_count_changed')
  async processUnseenCount(job) {
    await this.wsGateway.sendMessage(job.userId, 'unseen_count_changed', { unseenCount: job.unseenCount });
  }
}
