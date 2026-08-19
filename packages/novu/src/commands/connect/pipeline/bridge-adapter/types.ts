import type { ResolvedConnectAuth } from '../../auth/resolve-connect-auth';
import type {
  AgentSummary,
  AiSdkConnectOutcome,
  BridgeRequirement,
  BridgeRequirementId,
  ConnectCommandOptions,
} from '../../types';
import type { ConnectUI } from '../../ui/ui';
import type { ScaffoldBridgeProjectResult } from '../bridge/scaffold-project';
import type { LlmAuthChoice } from '../llm-auth/types';

/**
 * Bridge-adapter connect flows (AI SDK, LangChain) share one reconcile engine.
 * The outcome shape is identical across adapters.
 */
export type BridgeAdapterConnectOutcome = AiSdkConnectOutcome;

export type BridgeAdapterVariant = 'ai-sdk' | 'langchain';

export type BridgeAdapterRequirementsSnapshot = {
  requirements: BridgeRequirement[];
  coreReady: boolean;
};

export type BridgeAdapterSetupInput = {
  options: ConnectCommandOptions;
  ui: ConnectUI;
  auth: ResolvedConnectAuth;
  agent: AgentSummary;
  deferScaffoldSummary?: boolean;
};

export type BridgeAdapterScaffoldInput = {
  parentDir: string;
  appName: string;
  secretKey: string;
  apiUrl: string;
  agentIdentifier: string;
  silent?: boolean;
  llmAuth: LlmAuthChoice;
};

export type BridgeAdapterRequirementsInput = {
  projectDir: string;
  secretKey: string;
  agentIdentifier: string;
};

/**
 * Adapter that plugs a specific bridge runtime (AI SDK, LangChain) into the
 * shared reconcile/scaffold engine. Everything runtime-specific — package set,
 * wiring detection, scaffold template, agent prompt — lives here; the engine
 * owns the interactive flow.
 */
export interface BridgeAdapter {
  variant: BridgeAdapterVariant;
  autofixOrder: readonly BridgeRequirementId[];
  computeRequirements(input: BridgeAdapterRequirementsInput): BridgeAdapterRequirementsSnapshot;
  recomputeCoreReady(requirements: BridgeRequirement[]): boolean;
  resolvePackagesToInstall(projectDir: string): string[];
  buildInstallCommand(projectDir: string): string;
  runPackageInstall(opts: { projectDir: string; silent?: boolean }): Promise<unknown>;
  buildWiringInstructions(projectDir: string, agentIdentifier: string): string;
  agentPrompt: string;
  detectIsWired(projectDir: string): boolean;
  scaffold(input: BridgeAdapterScaffoldInput): Promise<ScaffoldBridgeProjectResult>;
  writeRequirementsFile(opts: {
    projectDir: string;
    requirements: BridgeRequirement[];
    wiringInstructions?: string;
    agentPrompt?: string;
  }): Promise<string>;
  runBridge(input: { projectDir: string }): Promise<void>;
}
