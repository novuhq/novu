import { applyDecorators, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiExcludeController } from '@nestjs/swagger';
import { InternalAuthGuard } from '../guards/internal-auth.guard';

export function RequireInternalAuth() {
  return applyDecorators(UseGuards(InternalAuthGuard), ApiBearerAuth(), ApiExcludeController());
}
