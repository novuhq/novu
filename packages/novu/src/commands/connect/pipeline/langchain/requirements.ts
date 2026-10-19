import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import type { BridgeRequirement, BridgeRequirementId } from '../../types';
import { hasDevNovuScript, shouldRefreshDevNovuScript } from '../ai-sdk/dev-script';
import { readEnvSecretKey, readProjectEnvValue } from '../ai-sdk/wire-env';
import { hasDependency, readProjectPackageJson } from '../bridge/project-package';
import { detectLangChainWiring } from './detect-wiring';
import { resolveLangChainPackageStatus } from './package-install';

export type ComputeRequirementsInput = {
  projectDir: string;
  secretKey: string;
  agentIdentifier: string;
};

export type LangChainRequirementsSnapshot = {
  requirements: BridgeRequirement[];
  coreReady: boolean;
};

const LANGCHAIN_CORE_REQUIREMENT_IDS: readonly BridgeRequirementId[] = ['package', 'env', 'dev-script'];

const PROVIDER_ENV_HINTS = [
  {
    packageName: '@langchain/openai',
    envKey: 'OPENAI_API_KEY',
    detail: 'Set OPENAI_API_KEY for your LLM',
  },
  {
    packageName: '@langchain/anthropic',
    envKey: 'ANTHROPIC_API_KEY',
    detail: 'Set ANTHROPIC_API_KEY for your LLM',
  },
  {
    packageName: '@langchain/google-genai',
    envKey: 'GOOGLE_API_KEY',
    detail: 'Set GOOGLE_API_KEY for your LLM',
  },
] as const;

function computePackageRequirement(projectDir: string): BridgeRequirement {
  const pkg = readProjectPackageJson(projectDir);
  if (!pkg) {
    return {
      id: 'package',
      status: 'manual',
      detail: 'No package.json found',
    };
  }

  const status = resolveLangChainPackageStatus(projectDir);

  if (status.kind === 'ok') {
    return {
      id: 'package',
      status: 'ok',
      detail: '@novu/framework and langchain installed',
    };
  }

  return {
    id: 'package',
    status: 'autofixable',
    detail: `Missing packages: ${status.packages.join(', ')}`,
  };
}

function computeEnvRequirement(projectDir: string, input: ComputeRequirementsInput): BridgeRequirement {
  const secretKey = readEnvSecretKey(projectDir);

  if (!secretKey) {
    return {
      id: 'env',
      status: 'autofixable',
      detail: 'NOVU_SECRET_KEY not set',
    };
  }

  if (secretKey !== input.secretKey.trim()) {
    return {
      id: 'env',
      status: 'autofixable',
      detail: 'NOVU_SECRET_KEY differs from the connected account',
    };
  }

  return {
    id: 'env',
    status: 'ok',
    detail: 'Novu credentials configured',
  };
}

function computeDevScriptRequirement(projectDir: string): BridgeRequirement {
  if (!hasDevNovuScript(projectDir)) {
    return {
      id: 'dev-script',
      status: 'autofixable',
      detail: 'dev:novu script missing',
    };
  }

  if (shouldRefreshDevNovuScript(projectDir)) {
    return {
      id: 'dev-script',
      status: 'autofixable',
      detail: 'dev:novu port does not match your dev server',
    };
  }

  return {
    id: 'dev-script',
    status: 'ok',
    detail: 'dev:novu script present',
  };
}

function computeCodeWiringRequirement(projectDir: string): BridgeRequirement {
  const wiring = detectLangChainWiring(projectDir);

  if (wiring.isWired) {
    return {
      id: 'code-wiring',
      status: 'ok',
      detail: 'LangChain agent wired in source',
    };
  }

  const parts: string[] = [];
  if (!wiring.hasLangChainImport) {
    parts.push('@novu/framework/langchain import not found');
  }
  if (!wiring.hasBridgeRoute) {
    parts.push('bridge route app/api/novu/route.ts not found');
  }

  return {
    id: 'code-wiring',
    status: 'manual',
    detail: parts.length > 0 ? parts.join('; ') : 'Agent wiring incomplete',
  };
}

function computeProviderEnvHints(projectDir: string): BridgeRequirement[] {
  const pkg = readProjectPackageJson(projectDir);
  if (!pkg) {
    return [];
  }

  const hints: BridgeRequirement[] = [];

  for (const hint of PROVIDER_ENV_HINTS) {
    if (!hasDependency(pkg, hint.packageName)) {
      continue;
    }

    if (readProjectEnvValue(projectDir, hint.envKey)) {
      continue;
    }

    hints.push({
      id: 'provider-env',
      status: 'manual',
      detail: hint.detail,
    });
  }

  return hints;
}

export function computeLangChainRequirements(input: ComputeRequirementsInput): LangChainRequirementsSnapshot {
  const projectDir = path.resolve(input.projectDir);
  const requirements: BridgeRequirement[] = [
    computePackageRequirement(projectDir),
    computeEnvRequirement(projectDir, input),
    computeDevScriptRequirement(projectDir),
    computeCodeWiringRequirement(projectDir),
  ];

  const coreReady = recomputeCoreReady(requirements);
  const providerHints = computeProviderEnvHints(projectDir);

  return {
    requirements: [...requirements, ...providerHints],
    coreReady,
  };
}

export function recomputeCoreReady(requirements: BridgeRequirement[]): boolean {
  return requirements
    .filter((req) => LANGCHAIN_CORE_REQUIREMENT_IDS.includes(req.id))
    .every((req) => req.status === 'ok');
}

export const LANGCHAIN_REQUIREMENTS_FILE_ENV = 'NOVU_CONNECT_LANGCHAIN_REQUIREMENTS_FILE';

export const AUTOFIX_REQUIREMENT_ORDER: readonly BridgeRequirementId[] = ['env', 'dev-script', 'package'];

export async function writeLangChainRequirementsFile(opts: {
  projectDir: string;
  requirements: BridgeRequirement[];
  wiringInstructions?: string;
  agentPrompt?: string;
}): Promise<string> {
  const lines = [
    '# Novu LangChain connect requirements',
    '',
    `Project: ${opts.projectDir}`,
    '',
    ...opts.requirements.map((req) => `- [${req.status === 'ok' ? 'x' : ' '}] ${req.id}: ${req.detail}`),
  ];

  if (opts.wiringInstructions) {
    lines.push('', '## Code wiring', '', opts.wiringInstructions);
  }

  if (opts.agentPrompt) {
    lines.push(
      '',
      '## Agent prompt',
      '',
      'Paste the following into your coding agent to finish wiring:',
      '',
      opts.agentPrompt
    );
  }

  const filePath = path.join(os.tmpdir(), `novu-langchain-requirements-${process.pid}.txt`);
  await fs.promises.writeFile(filePath, `${lines.join('\n')}\n`, 'utf8');

  return filePath;
}
