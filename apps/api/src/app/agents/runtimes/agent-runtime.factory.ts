import { Injectable } from '@nestjs/common';
import { AgentRuntimeEnum } from '@novu/dal';
import type { ResolvedAgentConfig } from '../services/agent-config-resolver.service';
import type { AgentRuntime } from './agent-runtime.interface';
import { BridgeRuntime } from './bridge.runtime';
import { ClaudeManagedRuntime } from './claude-managed.runtime';

@Injectable()
export class AgentRuntimeFactory {
  constructor(
    private readonly bridgeRuntime: BridgeRuntime,
    private readonly claudeManagedRuntime: ClaudeManagedRuntime
  ) {}

  resolve(config: Pick<ResolvedAgentConfig, 'runtime'>): AgentRuntime {
    switch (config.runtime) {
      case AgentRuntimeEnum.CLAUDE_MANAGED:
        return this.claudeManagedRuntime;
      default:
        return this.bridgeRuntime;
    }
  }
}
