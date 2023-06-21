import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Get,
  Param,
  Post,
  Put,
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
import { UpdateTenantResponseDto } from './dtos/update-tenant-response.dto';
import { UpdateTenantRequestDto } from './dtos/update-tenant-request.dto';
import { UpdateTenant } from './usecases/update-tenant/update-tenant.usecase';
import { UpdateTenantCommand } from './usecases/update-tenant/update-tenant.command';

@Controller('/tenants')
@ApiTags('Tenants')
@UseInterceptors(ClassSerializerInterceptor)
@UseGuards(JwtAuthGuard)
@ApiExcludeController()
export class TenantController {
  constructor(
    private CreateTenantUsecase: CreateTenant,
    private updateTenantUsecase: UpdateTenant,
    private getTenantUsecase: GetTenant
  ) {}

  @Get('/:tenantId')
  @ApiResponse(GetTenantResponseDto)
  @ApiOperation({
    summary: 'Get tenant',
    description: `Get tenant by your internal id used to identify the tenant`,
  })
  @ExternalApiAccessible()
  getTenantById(@UserSession() user: IJwtPayload, @Param('tenantId') tenantId: string): Promise<GetTenantResponseDto> {
    return this.getTenantUsecase.execute(
      GetTenantCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        id: tenantId,
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
    const command = CreateTenantCommand.create({
      environmentId: user.environmentId,
      organizationId: user.organizationId,
      identifier: body.identifier,
      name: body.name,
      data: body.data,
    });

    return await this.CreateTenantUsecase.execute(command);
  }

  @Put('/:tenantId')
  @ExternalApiAccessible()
  @ApiResponse(UpdateTenantResponseDto)
  @ApiOperation({
    summary: 'Update tenant',
    description: 'Update tenant under the current environment',
  })
  async updateTenant(
    @UserSession() user: IJwtPayload,
    @Param('tenantId') tenantId: string,
    @Body() body: UpdateTenantRequestDto
  ): Promise<UpdateTenantResponseDto> {
    return await this.updateTenantUsecase.execute(
      UpdateTenantCommand.create({
        identifier: tenantId,
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        name: body.name,
        data: body.data,
        newIdentifier: body.identifier,
      })
    );
  }
}
