import { Injectable } from '@nestjs/common';

import { InboundParseQueueService } from '../services/queues';
import { QueueHealthIndicator } from './queue-health-indicator.service';

const LOG_CONTEXT = 'InboundParseQueueServiceHealthIndicator';
const INDICATOR_KEY = 'inboundParseQueueService';
const SERVICE_NAME = 'InboundParseQueueService';

@Injectable()
export class InboundParseQueueServiceHealthIndicator extends QueueHealthIndicator {
  constructor(private inboundParseQueueService: InboundParseQueueService) {
    super(inboundParseQueueService, INDICATOR_KEY, SERVICE_NAME, LOG_CONTEXT);
  }
}
