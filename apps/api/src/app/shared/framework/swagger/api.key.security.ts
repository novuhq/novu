import { ApiBearerAuth } from '@nestjs/swagger';
import { applyDecorators, UseGuards } from '@nestjs/common';
import { UserAuthGuard } from '@novu/application-generic';

export function UserAuthentication() {
  return applyDecorators(UseGuards(UserAuthGuard), ApiBearerAuth());
}
