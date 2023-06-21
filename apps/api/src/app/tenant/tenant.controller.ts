import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
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
import { GetTenantResponseDto } from './dtos/get-tenant.response';
import { GetTenant } from './usecases/get-tenant/get-tenant.usecase';
import { GetTenantCommand } from './usecases/get-tenant/get-tenant.command';

@Controller('/tenants')
@ApiTags('Tenants')
@UseInterceptors(ClassSerializerInterceptor)
@UseGuards(JwtAuthGuard)
@ApiExcludeController()
export class TenantController {
  constructor(private createTenantUsecase: CreateTenant, private getTenantUsecase: GetTenant) {}

  @Get('/:identifier')
  @ApiResponse(GetTenantResponseDto)
  @ApiOperation({
    summary: 'Get tenant',
    description: `Get tenant by your internal id used to identify the tenant`,
  })
  @ExternalApiAccessible()
  getTenantById(
    @UserSession() user: IJwtPayload,
    @Param('identifier') identifier: string
  ): Promise<GetTenantResponseDto> {
    return this.getTenantUsecase.execute(
      GetTenantCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        identifier: identifier,
      })
    );
  }

  @Post('/')
  @ExternalApiAccessible()
  @ApiResponse(CreateTenantResponseDto)
  @ApiOperation({
    summary: 'Create tenant',
    description: 'Create tenant under the current environment',
  })
  async createTenant(
    @UserSession() user: IJwtPayload,
    @Body() body: CreateTenantRequestDto
  ): Promise<CreateTenantResponseDto> {
    return await this.createTenantUsecase.execute(
      CreateTenantCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        identifier: body.identifier,
        name: body.name,
        data: body.data,
      })
    );
  }
}
