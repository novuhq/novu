import { Injectable } from '@nestjs/common';

import { InboundParseQueue } from '../services';
import { QueueHealthIndicator } from './queue-health-indicator.service';

const LOG_CONTEXT = 'InboundParseQueueServiceHealthIndicator';
const INDICATOR_KEY = 'inboundParseQueue';
const SERVICE_NAME = 'InboundParseQueueService';

@Injectable()
export class InboundParseQueueServiceHealthIndicator extends QueueHealthIndicator {
  constructor(private inboundParseQueueService: InboundParseQueue) {
    super(inboundParseQueueService, INDICATOR_KEY, SERVICE_NAME, LOG_CONTEXT);
  }
}
