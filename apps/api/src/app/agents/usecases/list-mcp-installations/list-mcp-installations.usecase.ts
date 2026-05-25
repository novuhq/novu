import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  decryptMcpConnectionAuth,
  PinoLogger,
  SsrfBlockedError,
  safeOutboundJsonRequest,
} from '@novu/application-generic';
import { AgentMcpServerRepository, AgentRepository, McpConnectionRepository, SubscriberRepository } from '@novu/dal';
import { MCP_SERVERS, McpConnectionAuthModeEnum, McpConnectionStatusEnum } from '@novu/shared';

import { ListMcpInstallationsResponseDto, type McpInstallationDto } from '../../dtos/mcp-server.dto';
import { ListMcpInstallationsCommand } from './list-mcp-installations.command';

interface GithubInstallationRaw {
  id: unknown;
  account?: {
    login?: unknown;
    type?: unknown;
    avatar_url?: unknown;
  };
  repository_selection?: unknown;
  repositories_url?: unknown;
  html_url?: unknown;
}

/**
 * Fetch the live list of GitHub-App installations the subscriber's token
 * can act on for an MCP that uses the App + Installation flow (currently
 * only `github`).
 *
 * The mongo row carries a single-installation snapshot (the most recent
 * one captured at callback time), but a GitHub user-to-server token
 * implicitly grants access to **every** installation the user has
 * consented to across their personal account and every org. This usecase
 * is the authoritative read — the snapshot is just a display fallback for
 * when GitHub is briefly unreachable.
 *
 * Token-side failures are mapped onto the connection's `status` and
 * returned in the response so the caller doesn't have to make a second
 * call to discover that re-auth is needed:
 *  - 401 → flip connection to `expired`, return empty list + status.
 *  - everything else → 502 (BadRequest) with sanitized message.
 */
@Injectable()
export class ListMcpInstallations {
  constructor(
    private readonly agentRepository: AgentRepository,
    private readonly agentMcpServerRepository: AgentMcpServerRepository,
    private readonly mcpConnectionRepository: McpConnectionRepository,
    private readonly subscriberRepository: SubscriberRepository,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(ListMcpInstallations.name);
  }

  async execute(command: ListMcpInstallationsCommand): Promise<ListMcpInstallationsResponseDto> {
    const catalog = MCP_SERVERS.find((entry) => entry.id === command.mcpId);
    if (!catalog) {
      throw new NotFoundException(`Unknown MCP "${command.mcpId}".`);
    }
    if (!catalog.oauth) {
      throw new BadRequestException(`MCP "${command.mcpId}" does not have OAuth connectivity configured.`);
    }
    if (catalog.oauth.mode !== McpConnectionAuthModeEnum.NovuApp || !catalog.oauth.installation) {
      throw new BadRequestException(`MCP "${command.mcpId}" does not use the GitHub App + Installation flow.`);
    }

    const agent = await this.agentRepository.findOne(
      {
        identifier: command.agentIdentifier,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      },
      ['_id']
    );
    if (!agent) {
      throw new NotFoundException(`Agent "${command.agentIdentifier}" not found.`);
    }

    const enablement = await this.agentMcpServerRepository.findByAgentAndMcpId({
      organizationId: command.organizationId,
      environmentId: command.environmentId,
      agentId: agent._id,
      mcpId: command.mcpId,
    });
    if (!enablement) {
      throw new NotFoundException(`MCP "${command.mcpId}" is not enabled on agent "${command.agentIdentifier}".`);
    }

    const subscriber = await this.subscriberRepository.findBySubscriberId(command.environmentId, command.subscriberId);
    if (!subscriber) {
      throw new NotFoundException(`Subscriber "${command.subscriberId}" not found in this environment.`);
    }

    const connection = await this.mcpConnectionRepository.findSubscriberConnection({
      organizationId: command.organizationId,
      environmentId: command.environmentId,
      agentMcpServerId: enablement._id,
      subscriberId: subscriber._id,
    });
    if (!connection) {
      return { data: [], connectionStatus: McpConnectionStatusEnum.PendingOAuth };
    }
    if (connection.status !== McpConnectionStatusEnum.Connected) {
      return { data: [], connectionStatus: connection.status as McpConnectionStatusEnum };
    }
    if (!connection.auth?.accessToken) {
      return { data: [], connectionStatus: McpConnectionStatusEnum.Error };
    }

    const decrypted = decryptMcpConnectionAuth({ accessToken: connection.auth.accessToken });
    const accessToken = decrypted.accessToken;
    if (!accessToken) {
      return { data: [], connectionStatus: McpConnectionStatusEnum.Error };
    }

    try {
      const response = await safeOutboundJsonRequest<{ installations?: unknown }>({
        url: 'https://api.github.com/user/installations',
        method: 'GET',
        headers: {
          authorization: `Bearer ${accessToken}`,
          accept: 'application/vnd.github+json',
          'x-github-api-version': '2022-11-28',
        },
        timeoutMs: 10_000,
      });

      if (response.statusCode === 401) {
        // Token was revoked or rotated upstream. Flip the connection to
        // `expired` so the dashboard can prompt re-auth. We do NOT touch
        // `auth` itself — that's owned by the OAuth callback and the
        // refresh path; just the status enum.
        await this.mcpConnectionRepository.update(
          {
            _id: connection._id,
            _environmentId: command.environmentId,
            _organizationId: command.organizationId,
          },
          { $set: { status: McpConnectionStatusEnum.Expired } }
        );

        return { data: [], connectionStatus: McpConnectionStatusEnum.Expired };
      }

      if (response.statusCode < 200 || response.statusCode >= 300) {
        this.logger.warn(
          { mcpId: command.mcpId, status: response.statusCode },
          'GitHub /user/installations returned non-2xx; surfacing empty list'
        );

        return { data: [], connectionStatus: connection.status as McpConnectionStatusEnum };
      }

      const rawList = Array.isArray(response.body?.installations) ? (response.body.installations as unknown[]) : [];
      const data = rawList
        .map((entry): McpInstallationDto | null => buildInstallationDto(entry))
        .filter((entry): entry is McpInstallationDto => entry !== null);

      return { data, connectionStatus: McpConnectionStatusEnum.Connected };
    } catch (err) {
      if (err instanceof SsrfBlockedError) {
        // SSRF block is a server-side policy decision, never bubble the
        // upstream URL or reason directly. Return empty + Connected so
        // the dashboard renders "no installations to manage" rather than
        // a scary banner.
        this.logger.warn(
          { mcpId: command.mcpId, reason: err.reason },
          'GitHub /user/installations blocked by SSRF policy'
        );

        return { data: [], connectionStatus: McpConnectionStatusEnum.Connected };
      }
      this.logger.warn(
        { mcpId: command.mcpId, err: err instanceof Error ? err.message : String(err) },
        'GitHub /user/installations fetch failed'
      );
      throw new BadRequestException('Failed to fetch GitHub installations.');
    }
  }
}

function buildInstallationDto(entry: unknown): McpInstallationDto | null {
  if (!entry || typeof entry !== 'object') return null;
  const raw = entry as GithubInstallationRaw;

  const id = typeof raw.id === 'number' && Number.isFinite(raw.id) ? raw.id : null;
  if (id === null) return null;

  const accountLogin = typeof raw.account?.login === 'string' ? raw.account.login : 'unknown';
  const accountType: 'User' | 'Organization' = raw.account?.type === 'Organization' ? 'Organization' : 'User';
  const avatarUrl = typeof raw.account?.avatar_url === 'string' ? raw.account.avatar_url : undefined;
  const repositorySelection: 'all' | 'selected' = raw.repository_selection === 'all' ? 'all' : 'selected';
  const repositoriesUrl = typeof raw.repositories_url === 'string' ? raw.repositories_url : undefined;

  // Build a stable "Manage on GitHub" deep link. Org installations live
  // under the org's settings; user installations live under the user's
  // settings. `html_url` from the API is the canonical settings URL when
  // present, so we trust it; otherwise we fall back to the well-known
  // shape used by github.com.
  const manageUrl =
    typeof raw.html_url === 'string' && raw.html_url.length > 0
      ? raw.html_url
      : accountType === 'Organization'
        ? `https://github.com/organizations/${encodeURIComponent(accountLogin)}/settings/installations/${id}`
        : `https://github.com/settings/installations/${id}`;

  return {
    id,
    account: { login: accountLogin, type: accountType, avatarUrl },
    repositorySelection,
    repositoriesUrl,
    manageUrl,
  };
}
