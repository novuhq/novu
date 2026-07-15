import type { AiSdkConnectOutcome } from '../../types';
import { maybeRunBridgeAdapterTunnel, runBridgeAdapterProjectSetup } from '../bridge-adapter/engine';
import type { BridgeAdapterSetupInput } from '../bridge-adapter/types';
import { langChainAdapter } from './adapter';

export type LangChainSetupInput = BridgeAdapterSetupInput;

export async function runLangChainProjectSetup(input: LangChainSetupInput): Promise<AiSdkConnectOutcome> {
  return runBridgeAdapterProjectSetup(input, langChainAdapter);
}

export async function maybeRunLangChainTunnel(input: {
  outcome: AiSdkConnectOutcome | undefined;
  ci?: boolean;
}): Promise<boolean> {
  return maybeRunBridgeAdapterTunnel({ outcome: input.outcome, adapter: langChainAdapter, ci: input.ci });
}
