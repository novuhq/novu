import { Injectable, Logger } from '@nestjs/common';
import {
  BullMqService,
  type IManagedAgentJobData,
  WorkerBaseService,
  type WorkerOptions,
  WorkflowInMemoryProviderService,
} from '@novu/application-generic';
import { JobTopicNameEnum } from '@novu/shared';
import { ProcessManagedAgentTurnCommand } from '../usecases/process-managed-agent-turn/process-managed-agent-turn.command';
import { ProcessManagedAgentTurn } from '../usecases/process-managed-agent-turn/process-managed-agent-turn.usecase';

const LOG_CONTEXT = 'ManagedAgentWorker';
const MAX_TURN_MS = 3 * 60 * 1000;

@Injectable()
export class ManagedAgentWorker extends WorkerBaseService {
  constructor(
    private readonly processManagedAgentTurn: ProcessManagedAgentTurn,
    public workflowInMemoryProviderService: WorkflowInMemoryProviderService
  ) {
    super(JobTopicNameEnum.MANAGED_AGENT, new BullMqService(workflowInMemoryProviderService));

    this.initWorker(this.getWorkerProcessor(), this.getWorkerOptions());
  }

  private getWorkerOptions(): WorkerOptions {
    return {
      lockDuration: MAX_TURN_MS + 30_000,
      concurrency: 5,
    };
  }

  public getWorkerProcessor() {
    return async ({ data }: { data: IManagedAgentJobData }) => {
      try {
        Logger.verbose({ agentId: data.agentId }, 'Processing managed agent job', LOG_CONTEXT);
        await this.processManagedAgentTurn.execute(ProcessManagedAgentTurnCommand.create({ ...data }));
      } catch (err) {
        Logger.error(err, `Managed agent job failed for agent ${data.agentId}`, LOG_CONTEXT);
        throw err;
      }
    };
  }
}
