import type { AiSdkConnectOutcome } from '../../types';
import { maybeRunBridgeAdapterTunnel, runBridgeAdapterProjectSetup } from '../bridge-adapter/engine';
import type { BridgeAdapterSetupInput } from '../bridge-adapter/types';
import { aiSdkAdapter } from './adapter';

export type AiSdkSetupInput = BridgeAdapterSetupInput;

export async function runAiSdkProjectSetup(input: AiSdkSetupInput): Promise<AiSdkConnectOutcome> {
  return runBridgeAdapterProjectSetup(input, aiSdkAdapter);
}

export async function maybeRunAiSdkTunnel(input: {
  outcome: AiSdkConnectOutcome | undefined;
  ci?: boolean;
}): Promise<boolean> {
  return maybeRunBridgeAdapterTunnel({ outcome: input.outcome, adapter: aiSdkAdapter, ci: input.ci });
}
