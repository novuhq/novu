import Anthropic from '@anthropic-ai/sdk';
import { Injectable } from '@nestjs/common';
import { PinoLogger, ResourceValidatorService } from '@novu/application-generic';
import { EnvironmentVariableRepository } from '@novu/dal';
import { EnvironmentVariableType } from '@novu/shared';
import { ANTHROPIC_ORG_VAULT_ID_ENV_VAR } from '../dtos/agent-runtime.dto';

/**
 * Lazy-creates one Anthropic vault per Novu environment to hold credentials shared
 * across all subscribers (e.g. static bearer tokens for internal MCP servers).
 *
 * The Anthropic vault id is cached as a non-secret environment variable so we never
 * round-trip Anthropic to look it up.
 */
@Injectable()
export class OrgAnthropicVaultService {
  constructor(
    private readonly environmentVariableRepository: EnvironmentVariableRepository,
    private readonly resourceValidatorService: ResourceValidatorService,
    private readonly logger: PinoLogger
  ) {}

  async tryGet(organizationId: string, environmentId: string): Promise<string | undefined> {
    const variable = await this.environmentVariableRepository.findOne(
      { _organizationId: organizationId, key: ANTHROPIC_ORG_VAULT_ID_ENV_VAR },
      ['values']
    );
    const value = variable?.values?.find((item) => item._environmentId === environmentId)?.value;

    return value || undefined;
  }

  async ensureVault(params: {
    organizationId: string;
    environmentId: string;
    userId: string;
    apiKey: string;
  }): Promise<string> {
    const cached = await this.tryGet(params.organizationId, params.environmentId);
    if (cached) {
      return cached;
    }

    const client = this.buildClient(params.apiKey);
    const created = await client.beta.vaults.create({
      display_name: this.buildVaultName(params.organizationId, params.environmentId),
    });

    await this.persist({
      organizationId: params.organizationId,
      environmentId: params.environmentId,
      userId: params.userId,
      anthropicVaultId: created.id,
    });

    return created.id;
  }

  async setStaticBearer(params: {
    organizationId: string;
    environmentId: string;
    userId: string;
    apiKey: string;
    mcpServerUrl: string;
    token: string;
  }): Promise<{ credentialId: string }> {
    const vaultId = await this.ensureVault({
      organizationId: params.organizationId,
      environmentId: params.environmentId,
      userId: params.userId,
      apiKey: params.apiKey,
    });

    const client = this.buildClient(params.apiKey);

    // Drop any prior credential for the same MCP server URL to avoid Anthropic surfacing
    // multiple matches; static-bearer creds are cheap to recreate.
    await this.archiveCredentialsForMcpServer({ apiKey: params.apiKey, vaultId, mcpServerUrl: params.mcpServerUrl });

    const credential = await client.beta.vaults.credentials.create(vaultId, {
      auth: {
        type: 'static_bearer',
        token: params.token,
        mcp_server_url: params.mcpServerUrl,
      },
    });

    return { credentialId: credential.id };
  }

  async archiveCredentialsForMcpServer(params: {
    apiKey: string;
    vaultId: string;
    mcpServerUrl: string;
  }): Promise<void> {
    try {
      const client = this.buildClient(params.apiKey);
      for await (const credential of client.beta.vaults.credentials.list(params.vaultId)) {
        if (credential.archived_at) continue;
        const url = (credential.auth as { mcp_server_url?: string }).mcp_server_url;
        if (url === params.mcpServerUrl) {
          await client.beta.vaults.credentials.archive(credential.id, { vault_id: params.vaultId }).catch((err) => {
            this.logger.warn(err, `Failed to archive Anthropic credential ${credential.id}`);
          });
        }
      }
    } catch (err) {
      this.logger.warn(err, `Failed to enumerate Anthropic credentials in vault ${params.vaultId}`);
    }
  }

  private buildClient(apiKey: string): Anthropic {
    return new Anthropic({ apiKey });
  }

  private buildVaultName(organizationId: string, environmentId: string): string {
    return `novu-org-${organizationId.slice(-6)}-${environmentId.slice(-6)}`;
  }

  private async persist(params: {
    organizationId: string;
    environmentId: string;
    userId: string;
    anthropicVaultId: string;
  }): Promise<void> {
    const existing = await this.environmentVariableRepository.findOne(
      { _organizationId: params.organizationId, key: ANTHROPIC_ORG_VAULT_ID_ENV_VAR },
      '*'
    );

    if (!existing) {
      await this.resourceValidatorService.validateEnvironmentVariablesLimit(params.organizationId);
      await this.environmentVariableRepository.create({
        _organizationId: params.organizationId,
        key: ANTHROPIC_ORG_VAULT_ID_ENV_VAR,
        type: EnvironmentVariableType.STRING,
        isSecret: false,
        values: [{ _environmentId: params.environmentId, value: params.anthropicVaultId }],
        _updatedBy: params.userId,
      });

      return;
    }

    const updateExisting = await this.environmentVariableRepository.updateOne(
      {
        _organizationId: params.organizationId,
        _id: existing._id,
        'values._environmentId': params.environmentId,
      },
      {
        $set: {
          'values.$.value': params.anthropicVaultId,
          isSecret: false,
          type: EnvironmentVariableType.STRING,
          _updatedBy: params.userId,
        },
      }
    );

    if (updateExisting.matched === 0) {
      await this.environmentVariableRepository.updateOne(
        {
          _organizationId: params.organizationId,
          _id: existing._id,
          'values._environmentId': { $ne: params.environmentId },
        },
        {
          $set: { isSecret: false, type: EnvironmentVariableType.STRING, _updatedBy: params.userId },
          $push: { values: { _environmentId: params.environmentId, value: params.anthropicVaultId } },
        }
      );
    }

    this.logger.debug(`Cached ${ANTHROPIC_ORG_VAULT_ID_ENV_VAR} for environment ${params.environmentId}`);
  }
}
