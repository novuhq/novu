import { Body, ClassSerializerInterceptor, Controller, Post, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiExcludeController, ApiOperation, ApiTags } from '@nestjs/swagger';

import { IJwtPayload } from '@novu/shared';

import { JwtAuthGuard } from '../auth/framework/auth.guard';
import { UserSession } from '../shared/framework/user.decorator';
import { CreateTenantResponseDto } from './dtos/create-tenant-response.dto';
import { CreateTenant } from './usecases/create-tenant/create-tenant.usecase';
import { CreateTenantCommand } from './usecases/create-tenant/create-tenant.command';
import { CreateTenantRequestDto } from './dtos/create-tenant-request.dto';
import { ExternalApiAccessible } from '../auth/framework/external-api.decorator';
import { ApiResponse } from '../shared/framework/response.decorator';

@Controller('/tenants')
@ApiTags('Tenants')
@UseInterceptors(ClassSerializerInterceptor)
@UseGuards(JwtAuthGuard)
@ApiExcludeController()
export class TenantController {
  constructor(private CreateTenantUsecase: CreateTenant) {}

  @Post('/')
  @ExternalApiAccessible()
  @ApiResponse(CreateTenantRequestDto)
  @ApiOperation({
    summary: 'Create tenant',
    description: 'Create tenant under the current environment',
  })
  async createOrganization(
    @UserSession() user: IJwtPayload,
    @Body() body: CreateTenantRequestDto
  ): Promise<CreateTenantResponseDto> {
    const command = CreateTenantCommand.create({
      environmentId: user.environmentId,
      organizationId: user.organizationId,
      identifier: body.identifier,
      name: body.name,
      data: body.data,
    });

    return await this.CreateTenantUsecase.execute(command);
  }
}
