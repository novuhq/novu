import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
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
import { DeleteTenantCommand } from './usecases/delete-tenant/delete-tenant.command';
import { DeleteTenantResponseDto } from './dtos/delete-tenant.response.dto';
import { DeleteTenant } from './usecases/delete-tenant/delete-tenant.usecase';
import { UpdateTenantCommand } from './usecases/update-tenant/update-tenant.command';

@Controller('/tenants')
@ApiTags('Tenants')
@UseInterceptors(ClassSerializerInterceptor)
@UseGuards(JwtAuthGuard)
@ApiExcludeController()
export class TenantController {
  constructor(
    private createTenantUsecase: CreateTenant,
    private updateTenantUsecase: UpdateTenant,
    private getTenantUsecase: GetTenant,
    private deleteTenantUsecase: DeleteTenant
  ) {}

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

  @Put('/:identifier')
  @ExternalApiAccessible()
  @ApiResponse(UpdateTenantResponseDto)
  @ApiOperation({
    summary: 'Update tenant',
    description: 'Update tenant by your internal id used to identify the tenant',
  })
  async updateTenant(
    @UserSession() user: IJwtPayload,
    @Param('identifier') identifier: string,
    @Body() body: UpdateTenantRequestDto
  ): Promise<UpdateTenantResponseDto> {
    return await this.updateTenantUsecase.execute(
      UpdateTenantCommand.create({
        identifier: identifier,
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        name: body.name,
        data: body.data,
        newIdentifier: body.identifier,
      })
    );
  }

  @Delete('/:identifier')
  @ExternalApiAccessible()
  @UseGuards(JwtAuthGuard)
  @ApiResponse(DeleteTenantResponseDto)
  @ApiOperation({
    summary: 'Delete tenant',
    description: 'Deletes a tenant entity from the Novu platform',
  })
  async removeTenant(
    @UserSession() user: IJwtPayload,
    @Param('identifier') identifier: string
  ): Promise<DeleteTenantResponseDto> {
    return await this.deleteTenantUsecase.execute(
      DeleteTenantCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        identifier: identifier,
      })
    );
  }
}
