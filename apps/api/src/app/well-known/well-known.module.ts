import { Module } from '@nestjs/common';
import { OAuthProtectedResourceController } from './oauth-protected-resource.controller';

@Module({
  controllers: [OAuthProtectedResourceController],
})
export class WellKnownModule {}
