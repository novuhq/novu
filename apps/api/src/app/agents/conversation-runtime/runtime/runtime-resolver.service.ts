import { Injectable } from '@nestjs/common';
import type { AgentEntity } from '@novu/dal';
import { ManagedRuntime } from '../../managed-runtime/managed.runtime';
import type { AgentRuntime } from './agent-runtime.port';
import { BridgeRuntime } from './bridge.runtime';

@Injectable()
export class RuntimeResolver {
  constructor(
    private readonly bridgeRuntime: BridgeRuntime,
    private readonly managedRuntime: ManagedRuntime
  ) {}

  resolve(agent: Pick<AgentEntity, 'runtime' | 'managedRuntime'> | null): AgentRuntime {
    if (agent?.runtime === 'managed' && agent.managedRuntime) {
      return this.managedRuntime;
    }

    return this.bridgeRuntime;
  }
}
