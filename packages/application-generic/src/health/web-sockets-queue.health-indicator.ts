import { Injectable } from '@nestjs/common';

import { WebSocketsQueueService } from '../services/queues';
import { QueueHealthIndicator } from './queue-health-indicator.service';

const LOG_CONTEXT = 'WebSocketsQueueServiceHealthIndicator';
const INDICATOR_KEY = 'webSocketsQueue';
const SERVICE_NAME = 'WebSocketsQueueService';

@Injectable()
export class WebSocketsQueueServiceHealthIndicator extends QueueHealthIndicator {
  constructor(private webSocketsQueueService: WebSocketsQueueService) {
    super(webSocketsQueueService, INDICATOR_KEY, SERVICE_NAME, LOG_CONTEXT);
  }
}
