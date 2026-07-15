import type { BridgeAdapter } from '../bridge-adapter/types';
import { AI_SDK_AGENT_PROMPT } from './agent-prompt';
import { detectAiSdkWiring } from './detect-wiring';
import { buildAiSdkInstallCommand, resolveAiSdkPackagesToInstall, runAiSdkPackageInstall } from './package-install';
import {
  AUTOFIX_REQUIREMENT_ORDER,
  computeAiSdkRequirements,
  recomputeCoreReady,
  writeAiSdkRequirementsFile,
} from './requirements';
import { runAiSdkBridge } from './run-bridge';
import { scaffoldAiSdkProject } from './scaffold';
import { buildAiSdkWiringInstructions } from './wiring-instructions';

export const aiSdkAdapter: BridgeAdapter = {
  variant: 'ai-sdk',
  autofixOrder: AUTOFIX_REQUIREMENT_ORDER,
  computeRequirements: computeAiSdkRequirements,
  recomputeCoreReady,
  resolvePackagesToInstall: resolveAiSdkPackagesToInstall,
  buildInstallCommand: buildAiSdkInstallCommand,
  runPackageInstall: runAiSdkPackageInstall,
  buildWiringInstructions: buildAiSdkWiringInstructions,
  agentPrompt: AI_SDK_AGENT_PROMPT,
  detectIsWired: (projectDir) => detectAiSdkWiring(projectDir).isWired,
  scaffold: scaffoldAiSdkProject,
  writeRequirementsFile: writeAiSdkRequirementsFile,
  runBridge: runAiSdkBridge,
};
