import { randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { CacheService, PinoLogger } from '@novu/application-generic';

import { buildAgentApiRootUrl } from '../../shared/util/agent-api-root-url';

export const MCP_CONNECT_REDIRECT_PATH = '/v1/agents/mcp/r';

export const MCP_CONNECT_REDIRECT_TTL_SECONDS = 24 * 60 * 60;

const CACHE_KEY_PREFIX = 'mcp-connect-redirect:';

export function buildMcpConnectRedirectUrl(token: string): string {
  return `${buildAgentApiRootUrl()}${MCP_CONNECT_REDIRECT_PATH}/${token}`;
}

@Injectable()
export class McpConnectRedirectService {
  constructor(
    private readonly cacheService: CacheService,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  async issue(authorizeUrl: string): Promise<string> {
    if (!this.cacheService.cacheEnabled()) {
      this.logger.warn('Cache unavailable — returning full MCP authorize URL for connect redirect');

      return authorizeUrl;
    }

    const token = randomBytes(16).toString('base64url');

    try {
      await this.cacheService.set(this.cacheKey(token), authorizeUrl, {
        ttl: MCP_CONNECT_REDIRECT_TTL_SECONDS,
      });
    } catch (err) {
      this.logger.warn(`Failed to store MCP connect redirect token: ${(err as Error).message}`);

      return authorizeUrl;
    }

    return buildMcpConnectRedirectUrl(token);
  }

  async resolve(token: string): Promise<string | null> {
    if (!token || !this.cacheService.cacheEnabled()) {
      return null;
    }

    try {
      const url = await this.cacheService.get(this.cacheKey(token));

      return url || null;
    } catch (err) {
      this.logger.warn(`Failed to resolve MCP connect redirect token: ${(err as Error).message}`);

      return null;
    }
  }

  private cacheKey(token: string): string {
    return `${CACHE_KEY_PREFIX}${token}`;
  }
}
