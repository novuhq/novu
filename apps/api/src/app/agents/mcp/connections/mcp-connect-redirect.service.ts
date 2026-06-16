import { randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { CacheService, PinoLogger } from '@novu/application-generic';

export const MCP_CONNECT_REDIRECT_PATH = '/v1/agents/mcp/r';

export const MCP_CONNECT_REDIRECT_TTL_SECONDS = 24 * 60 * 60;

const CACHE_KEY_PREFIX = 'mcp-connect-redirect:';

export function buildAgentApiRootUrl(): string {
  const rootUrl = process.env.AGENT_API_HOSTNAME?.trim() || process.env.API_ROOT_URL?.trim();
  if (!rootUrl) {
    throw new Error('AGENT_API_HOSTNAME or API_ROOT_URL environment variable is required');
  }

  return rootUrl.replace(/\/$/, '');
}

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

  /**
   * Store a long OAuth authorize URL under a short opaque token and return the
   * public redirect URL. Falls back to the original URL when Redis is unavailable.
   */
  async issue(authorizeUrl: string): Promise<string> {
    if (!this.cacheService.cacheEnabled()) {
      this.logger.warn('Cache unavailable — returning full MCP authorize URL for connect redirect');

      return authorizeUrl;
    }

    const token = randomBytes(16).toString('base64url');

    await this.cacheService.set(this.cacheKey(token), authorizeUrl, {
      ttl: MCP_CONNECT_REDIRECT_TTL_SECONDS,
    });

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
