import { Injectable } from '@nestjs/common';
import { TriggerQueueService } from '@novu/application-generic';

@Injectable()
export class TriggerHandlerQueueService extends TriggerQueueService {}
