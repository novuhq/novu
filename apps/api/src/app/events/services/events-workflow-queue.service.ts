import { Injectable } from '@nestjs/common';
import { WorkflowQueueService } from '@novu/application-generic';

@Injectable()
export class EventsWorkflowQueueService extends WorkflowQueueService {}
