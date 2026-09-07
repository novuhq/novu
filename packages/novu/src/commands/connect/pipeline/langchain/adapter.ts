import type { BridgeAdapter } from '../bridge-adapter/types';
import { LANGCHAIN_AGENT_PROMPT } from './agent-prompt';
import { detectLangChainWiring } from './detect-wiring';
import {
  buildLangChainInstallCommand,
  resolveLangChainPackagesToInstall,
  runLangChainPackageInstall,
} from './package-install';
import {
  AUTOFIX_REQUIREMENT_ORDER,
  computeLangChainRequirements,
  recomputeCoreReady,
  writeLangChainRequirementsFile,
} from './requirements';
import { runLangChainBridge } from './run-bridge';
import { scaffoldLangChainProject } from './scaffold';
import { buildLangChainWiringInstructions } from './wiring-instructions';

export const langChainAdapter: BridgeAdapter = {
  variant: 'langchain',
  autofixOrder: AUTOFIX_REQUIREMENT_ORDER,
  computeRequirements: computeLangChainRequirements,
  recomputeCoreReady,
  resolvePackagesToInstall: resolveLangChainPackagesToInstall,
  buildInstallCommand: buildLangChainInstallCommand,
  runPackageInstall: runLangChainPackageInstall,
  buildWiringInstructions: buildLangChainWiringInstructions,
  agentPrompt: LANGCHAIN_AGENT_PROMPT,
  detectIsWired: (projectDir) => detectLangChainWiring(projectDir).isWired,
  scaffold: scaffoldLangChainProject,
  writeRequirementsFile: writeLangChainRequirementsFile,
  runBridge: runLangChainBridge,
};
