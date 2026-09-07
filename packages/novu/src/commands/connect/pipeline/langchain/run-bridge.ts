import { runBridgeDevTunnel } from '../bridge-adapter/run-bridge';

export type RunLangChainBridgeInput = {
  projectDir: string;
};

export async function runLangChainBridge(input: RunLangChainBridgeInput): Promise<void> {
  return runBridgeDevTunnel({ projectDir: input.projectDir, appLabel: 'LangChain app' });
}
