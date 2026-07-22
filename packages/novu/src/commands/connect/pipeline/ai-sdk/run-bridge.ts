import { runBridgeDevTunnel } from '../bridge-adapter/run-bridge';

export type RunAiSdkBridgeInput = {
  projectDir: string;
};

export async function runAiSdkBridge(input: RunAiSdkBridgeInput): Promise<void> {
  return runBridgeDevTunnel({ projectDir: input.projectDir, appLabel: 'AI SDK app' });
}
