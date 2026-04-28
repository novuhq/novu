import type { BridgeExecutorParams } from '../services/bridge-executor.service';

export type AgentRuntimeExecuteParams = BridgeExecutorParams;

export interface AgentRuntime {
  execute(params: AgentRuntimeExecuteParams): Promise<void>;
}
