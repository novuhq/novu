import type { AgentRuntimeCapabilities, AgentRuntimeConfigDto } from '@novu/shared';
import { AGENT_RUNTIME_PROVIDERS, AgentRuntimeProviderIdEnum } from '@novu/shared';
import { BaseAgentRuntimeProvider } from '../base-agent-runtime.provider';
import { AgentRuntimeBadRequestError } from '../errors';
import type {
  CreateAgentInput,
  CreateAgentResult,
  GetAgentResult,
  GetEnvironmentResult,
  ProvisionIntegrationInput,
  ProvisionIntegrationResult,
  UpdateAgentRuntimeConfigInput,
  ValidateCredentialsInput,
} from '../i-agent-runtime-provider';
import { resolveGeminiCredentials } from './google-credentials';

const DEFAULT_GEMINI_MODEL = 'gemini-2.0-flash';

export type GeminiProviderInit = {
  projectId?: string;
  engineId?: string;
};

export class GeminiAgentRuntimeProvider extends BaseAgentRuntimeProvider {
  readonly providerId = AgentRuntimeProviderIdEnum.Google;
  readonly capabilities: AgentRuntimeCapabilities;

  private readonly _projectId?: string;
  private readonly _engineId?: string;

  constructor(init: GeminiProviderInit = {}) {
    super();
    this._projectId = init.projectId;
    this._engineId = init.engineId;

    const catalogEntry = AGENT_RUNTIME_PROVIDERS.find((p) => p.providerId === AgentRuntimeProviderIdEnum.Google);
    if (!catalogEntry) {
      throw new Error('Google agent runtime is missing from AGENT_RUNTIME_PROVIDERS');
    }

    this.capabilities = catalogEntry.capabilities;
  }

  async validateCredentials(_input: ValidateCredentialsInput): Promise<void> {
    if (!this._projectId) {
      throw new AgentRuntimeBadRequestError(
        'GCP Project ID is required for Gemini Enterprise.',
        AgentRuntimeProviderIdEnum.Google
      );
    }

    if (!this._engineId) {
      throw new AgentRuntimeBadRequestError(
        'Engine ID is required. Pre-create the agent engine in the Discovery Engine console ' +
          'and set it in the integration credentials (Engine ID field).',
        AgentRuntimeProviderIdEnum.Google
      );
    }
  }

  async createAgent(_input: CreateAgentInput): Promise<CreateAgentResult> {
    if (!this._engineId) {
      throw new AgentRuntimeBadRequestError(
        'Engine ID is required. Pre-create the agent engine in the Discovery Engine console ' +
          'and set it in the integration credentials (Engine ID field).',
        AgentRuntimeProviderIdEnum.Google
      );
    }

    return { externalAgentId: this._engineId };
  }

  async getAgent(externalAgentId: string): Promise<GetAgentResult> {
    return { externalAgentId, name: externalAgentId };
  }

  async getEnvironment(externalEnvironmentId: string): Promise<GetEnvironmentResult> {
    return {
      id: externalEnvironmentId,
      name: this._projectId ?? externalEnvironmentId,
    };
  }

  async deleteAgent(_externalAgentId: string): Promise<void> {}

  async getConfig(_externalAgentId: string): Promise<AgentRuntimeConfigDto> {
    return {
      model: DEFAULT_GEMINI_MODEL,
      systemPrompt: '',
      mcpServers: [],
      tools: [],
      skills: [],
    };
  }

  async updateConfig(_externalAgentId: string, patch: UpdateAgentRuntimeConfigInput): Promise<AgentRuntimeConfigDto> {
    return {
      model: patch.model ?? DEFAULT_GEMINI_MODEL,
      systemPrompt: patch.systemPrompt ?? '',
      mcpServers: patch.mcpServers ?? [],
      tools: patch.tools ?? [],
      skills: patch.skills ?? [],
    };
  }

  async refreshPlatformDefinition(_externalAgentId: string): Promise<void> {}

  async provisionIntegration(_input: ProvisionIntegrationInput): Promise<ProvisionIntegrationResult> {
    return { credentialsUpdate: {} };
  }

  async deprovisionIntegration(_credentialsUpdate: Record<string, unknown>): Promise<void> {}
}

export function createGeminiProvider(credentials: Record<string, unknown> = {}): GeminiAgentRuntimeProvider {
  const resolved = resolveGeminiCredentials(credentials);

  if (!resolved) {
    return new GeminiAgentRuntimeProvider({});
  }

  return new GeminiAgentRuntimeProvider({
    projectId: resolved.projectId,
    engineId: resolved.engineId,
  });
}
