import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import type { ChatSdkRequirement, ChatSdkRequirementId } from '../../types';
import { detectChatSdkWiring } from './detect-wiring';
import { hasDevNovuScript, shouldRefreshDevNovuScript } from './dev-script';
import { resolveChatSdkPackagesToInstall } from './package-install';
import { readProjectPackageJson } from './project-package';
import { readEnvAgentIdentifier, readEnvSecretKey } from './wire-env';

export type ComputeRequirementsInput = {
  projectDir: string;
  secretKey: string;
  agentIdentifier: string;
};

export type ChatSdkRequirementsSnapshot = {
  requirements: ChatSdkRequirement[];
  coreReady: boolean;
};

function computePackageRequirement(projectDir: string): ChatSdkRequirement {
  const pkg = readProjectPackageJson(projectDir);
  if (!pkg) {
    return {
      id: 'package',
      status: 'manual',
      detail: 'No package.json found',
    };
  }

  const missing = resolveChatSdkPackagesToInstall(projectDir);

  if (missing.length === 0) {
    return {
      id: 'package',
      status: 'ok',
      detail: 'Chat SDK packages installed',
    };
  }

  return {
    id: 'package',
    status: 'autofixable',
    detail: `Missing packages: ${missing.join(', ')}`,
  };
}

function computeEnvRequirement(projectDir: string, input: ComputeRequirementsInput): ChatSdkRequirement {
  const secretKey = readEnvSecretKey(projectDir);
  const agentIdentifier = readEnvAgentIdentifier(projectDir);

  if (!secretKey && !agentIdentifier) {
    return {
      id: 'env',
      status: 'autofixable',
      detail: 'NOVU_SECRET_KEY and NOVU_AGENT_IDENTIFIER not set',
    };
  }

  if (!secretKey) {
    return {
      id: 'env',
      status: 'autofixable',
      detail: 'NOVU_SECRET_KEY not set',
    };
  }

  if (!agentIdentifier) {
    return {
      id: 'env',
      status: 'autofixable',
      detail: 'NOVU_AGENT_IDENTIFIER not set',
    };
  }

  if (secretKey !== input.secretKey.trim()) {
    return {
      id: 'env',
      status: 'autofixable',
      detail: 'NOVU_SECRET_KEY differs from the connected account',
    };
  }

  if (agentIdentifier !== input.agentIdentifier.trim()) {
    return {
      id: 'env',
      status: 'autofixable',
      detail: 'NOVU_AGENT_IDENTIFIER differs from the connected agent',
    };
  }

  return {
    id: 'env',
    status: 'ok',
    detail: 'Novu credentials configured',
  };
}

function computeDevScriptRequirement(projectDir: string): ChatSdkRequirement {
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

function computeCodeWiringRequirement(projectDir: string): ChatSdkRequirement {
  const wiring = detectChatSdkWiring(projectDir);

  if (wiring.isWired) {
    return {
      id: 'code-wiring',
      status: 'ok',
      detail: 'Novu adapter wired in source',
    };
  }

  const parts: string[] = [];
  if (!wiring.hasAdapterCall) {
    parts.push('createNovuAdapter not found');
  }
  if (!wiring.hasBridgeRoute) {
    parts.push('bridge webhook route not found');
  }

  return {
    id: 'code-wiring',
    status: 'manual',
    detail: parts.length > 0 ? parts.join('; ') : 'Adapter wiring incomplete',
  };
}

export function computeChatSdkRequirements(input: ComputeRequirementsInput): ChatSdkRequirementsSnapshot {
  const projectDir = path.resolve(input.projectDir);
  const requirements: ChatSdkRequirement[] = [
    computePackageRequirement(projectDir),
    computeEnvRequirement(projectDir, input),
    computeDevScriptRequirement(projectDir),
    computeCodeWiringRequirement(projectDir),
  ];

  const coreReady = recomputeCoreReady(requirements);

  return { requirements, coreReady };
}

export function recomputeCoreReady(requirements: ChatSdkRequirement[]): boolean {
  return requirements.filter((req) => req.id !== 'code-wiring').every((req) => req.status === 'ok');
}

export const CHAT_SDK_REQUIREMENTS_FILE_ENV = 'NOVU_CONNECT_CHAT_SDK_REQUIREMENTS_FILE';

export const AUTOFIX_REQUIREMENT_ORDER: readonly ChatSdkRequirementId[] = ['env', 'dev-script', 'package'];

export async function writeChatSdkRequirementsFile(opts: {
  projectDir: string;
  requirements: ChatSdkRequirement[];
  wiringInstructions?: string;
}): Promise<string> {
  const lines = [
    '# Novu Chat SDK connect requirements',
    '',
    `Project: ${opts.projectDir}`,
    '',
    ...opts.requirements.map((req) => `- [${req.status === 'ok' ? 'x' : ' '}] ${req.id}: ${req.detail}`),
  ];

  if (opts.wiringInstructions) {
    lines.push('', '## Code wiring', '', opts.wiringInstructions);
  }

  const filePath = path.join(os.tmpdir(), `novu-chat-sdk-requirements-${process.pid}.txt`);
  await fs.promises.writeFile(filePath, `${lines.join('\n')}\n`, 'utf8');

  return filePath;
}
