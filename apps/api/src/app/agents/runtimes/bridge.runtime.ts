import { Injectable } from '@nestjs/common';
import { BridgeExecutorService } from '../services/bridge-executor.service';
import type { AgentRuntime, AgentRuntimeExecuteParams } from './agent-runtime.interface';

@Injectable()
export class BridgeRuntime implements AgentRuntime {
  constructor(private readonly bridgeExecutor: BridgeExecutorService) {}

  async execute(params: AgentRuntimeExecuteParams): Promise<void> {
    await this.bridgeExecutor.execute(params);
  }
}
