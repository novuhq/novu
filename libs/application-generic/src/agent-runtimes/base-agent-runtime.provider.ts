import type { AgentRuntimeCapabilities, AgentRuntimeConfigDto, AgentRuntimeProviderIdEnum } from '@novu/shared';
import { UnsupportedCapabilityError } from './errors';
import type {
  CreateAgentInput,
  CreateAgentResult,
  CreateVaultInput,
  CreateVaultResult,
  DeleteVaultCredentialInput,
  GetAgentResult,
  GetEnvironmentResult,
  IAgentRuntimeProvider,
  ParsedMcpInitFailure,
  PendingToolApproval,
  ProvisionIntegrationInput,
  ProvisionIntegrationResult,
  UpdateAgentRuntimeConfigInput,
  UploadSkillInput,
  UploadSkillResult,
  UpsertVaultCredentialInput,
  UpsertVaultCredentialResult,
  ValidateCredentialsInput,
} from './i-agent-runtime-provider';

/**
 * Shared base for concrete agent-runtime provider classes.
 *
 * Concrete providers MUST override every abstract method below; the
 * non-abstract methods provide safe defaults for capability-bound features
 * so a provider that doesn't support `tokenVault` (etc.) gets a loud
 * runtime error if a caller forgets to gate on `capabilities.tokenVault`.
 *
 * `parseMcpInitFailure` returns `null` by default — providers that have a
 * recognisable MCP-init error shape override it. Returning `null` keeps the
 * lazy-OAuth code path inert until each provider opts in.
 */
export abstract class BaseAgentRuntimeProvider implements IAgentRuntimeProvider {
  abstract readonly providerId: AgentRuntimeProviderIdEnum;

  abstract readonly capabilities: AgentRuntimeCapabilities;

  abstract validateCredentials(input: ValidateCredentialsInput): Promise<void>;

  abstract createAgent(input: CreateAgentInput): Promise<CreateAgentResult>;

  abstract getAgent(externalAgentId: string): Promise<GetAgentResult>;

  abstract getEnvironment(externalEnvironmentId: string): Promise<GetEnvironmentResult>;

  abstract deleteAgent(externalAgentId: string): Promise<void>;

  abstract getConfig(externalAgentId: string): Promise<AgentRuntimeConfigDto>;

  abstract updateConfig(externalAgentId: string, patch: UpdateAgentRuntimeConfigInput): Promise<AgentRuntimeConfigDto>;

  abstract provisionIntegration(input: ProvisionIntegrationInput): Promise<ProvisionIntegrationResult>;

  abstract deprovisionIntegration(credentialsUpdate: Record<string, unknown>): Promise<void>;

  parseMcpInitFailure(_err: unknown): ParsedMcpInitFailure | null {
    return null;
  }

  getPendingToolApproval(_sessionId: string): Promise<PendingToolApproval | null> {
    return Promise.resolve(null);
  }

  createVault(_input: CreateVaultInput): Promise<CreateVaultResult> {
    throw new UnsupportedCapabilityError('tokenVault', this.providerId);
  }

  upsertVaultCredential(_input: UpsertVaultCredentialInput): Promise<UpsertVaultCredentialResult> {
    throw new UnsupportedCapabilityError('tokenVault', this.providerId);
  }

  deleteVaultCredential(_input: DeleteVaultCredentialInput): Promise<void> {
    throw new UnsupportedCapabilityError('tokenVault', this.providerId);
  }

  uploadSkill(_input: UploadSkillInput): Promise<UploadSkillResult> {
    throw new UnsupportedCapabilityError('skills', this.providerId);
  }
}
