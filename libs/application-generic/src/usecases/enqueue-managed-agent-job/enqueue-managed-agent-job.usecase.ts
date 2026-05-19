import { Injectable } from '@nestjs/common';
import { PinoLogger } from '../../logging';
import { ManagedAgentQueueService } from '../../services/queues/managed-agent-queue.service';
import { EnqueueManagedAgentJobCommand } from './enqueue-managed-agent-job.command';

/**
 * Thin wrapper around `ManagedAgentQueueService.add` so callers outside the
 * `agents` module (notably `McpOAuthCallback` replaying a parked turn) can
 * enqueue without re-implementing the queue-payload envelope. Today the
 * inbound `ManagedExecutorService` is the only other producer; this usecase
 * keeps both paths in lockstep.
 */
@Injectable()
export class EnqueueManagedAgentJob {
  constructor(
    private readonly managedAgentQueue: ManagedAgentQueueService,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  async execute(command: EnqueueManagedAgentJobCommand): Promise<void> {
    await this.managedAgentQueue.add({
      name: command.jobData.agentId,
      data: command.jobData,
    });

    this.logger.info(
      {
        agentId: command.jobData.agentId,
        conversationId: command.jobData.conversationId,
      },
      'Enqueued managed agent job'
    );
  }
}
