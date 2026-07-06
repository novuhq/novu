import { Controller, Get, Res, VERSION_NEUTRAL } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import type { Response } from 'express';

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
