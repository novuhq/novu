import { Controller, Get, Res, VERSION_NEUTRAL } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import type { Response } from 'express';

/**
 * RFC 9728 OAuth 2.0 Protected Resource Metadata.
 *
 * Served unversioned (bypasses the `/v1` URI version prefix) and publicly (no
 * `@RequireAuthentication()`), so MCP clients can discover that this API is an
 * OAuth resource server and that Clerk is its authorization server.
 *
 * The payload is written straight to the Express response to bypass the global
 * `ResponseInterceptor` wrapping — MCP clients expect the metadata fields at the
 * top level, not nested under `data`.
 */
@ApiExcludeController()
@Controller({ path: '.well-known/oauth-protected-resource', version: VERSION_NEUTRAL })
export class OAuthProtectedResourceController {
  @Get()
  getProtectedResourceMetadata(@Res() res: Response): void {
    const resource = (process.env.API_ROOT_URL ?? 'https://api.novu.co').replace(/\/+$/, '');
    const issuer = process.env.CLERK_ISSUER_URL?.replace(/\/+$/, '');

    res.set('Cache-Control', 'public, max-age=3600');
    res.json({
      resource,
      authorization_servers: issuer ? [issuer] : [],
      scopes_supported: ['user:org:read'],
      bearer_methods_supported: ['header'],
    });
  }
}
