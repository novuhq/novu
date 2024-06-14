import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { ApiRateLimitCategoryEnum, UserSessionData } from '@novu/shared';
import {
  CreateTenant,
  CreateTenantCommand,
  GetTenant,
  GetTenantCommand,
  UpdateTenant,
  UpdateTenantCommand,
} from '@novu/application-generic';
import { UserSession } from '../shared/framework/user.decorator';
import { ExternalApiAccessible } from '../auth/framework/external-api.decorator';
import {
  ApiCommonResponses,
  ApiConflictResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiResponse,
} from '../shared/framework/response.decorator';
import { DeleteTenantCommand } from './usecases/delete-tenant/delete-tenant.command';
import { DeleteTenant } from './usecases/delete-tenant/delete-tenant.usecase';
import { ApiOkPaginatedResponse } from '../shared/framework/paginated-ok-response.decorator';
import { PaginatedResponseDto } from '../shared/dtos/pagination-response';
import { GetTenants } from './usecases/get-tenants/get-tenants.usecase';
import { GetTenantsCommand } from './usecases/get-tenants/get-tenants.command';
import {
  CreateTenantRequestDto,
  CreateTenantResponseDto,
  GetTenantResponseDto,
  GetTenantsRequestDto,
  UpdateTenantRequestDto,
  UpdateTenantResponseDto,
} from './dtos';
import { ThrottlerCategory } from '../rate-limiting/guards';
import { UserAuthentication } from '../shared/framework/swagger/api.key.security';

import { SdkUsePagination } from '../shared/framework/swagger/sdk.decorators';

@ThrottlerCategory(ApiRateLimitCategoryEnum.CONFIGURATION)
@ApiCommonResponses()
@Controller('/tenants')
@ApiTags('Tenants')
@UseInterceptors(ClassSerializerInterceptor)
@UserAuthentication()
export class TenantController {
  constructor(
    private createTenantUsecase: CreateTenant,
    private updateTenantUsecase: UpdateTenant,
    private getTenantUsecase: GetTenant,
    private deleteTenantUsecase: DeleteTenant,
    private getTenantsUsecase: GetTenants
  ) {}

  @Get('')
  @ExternalApiAccessible()
  @UserAuthentication()
  @ApiOkPaginatedResponse(GetTenantResponseDto)
  @ApiOperation({
    summary: 'Get tenants',
    description: 'Returns a list of tenants, could paginated using the `page` and `limit` query parameter',
  })
  @SdkUsePagination()
  async listTenants(
    @UserSession() user: UserSessionData,
    @Query() query: GetTenantsRequestDto
  ): Promise<PaginatedResponseDto<GetTenantResponseDto>> {
    return await this.getTenantsUsecase.execute(
      GetTenantsCommand.create({
        organizationId: user.organizationId,
        environmentId: user.environmentId,
        page: query.page,
        limit: query.limit,
      })
    );
  }

  @Get('/:identifier')
  @ApiResponse(GetTenantResponseDto)
  @ApiOperation({
    summary: 'Get tenant',
    description: `Get tenant by your internal id used to identify the tenant`,
  })
  @ApiNotFoundResponse({
    description: 'The tenant with the identifier provided does not exist in the database.',
  })
  @ExternalApiAccessible()
  async getTenantById(
    @UserSession() user: UserSessionData,
    @Param('identifier') identifier: string
  ): Promise<GetTenantResponseDto> {
    return await this.getTenantUsecase.execute(
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
  @ApiConflictResponse({
    description: 'A tenant with the same identifier is already exist.',
  })
  async createTenant(
    @UserSession() user: UserSessionData,
    @Body() body: CreateTenantRequestDto
  ): Promise<CreateTenantResponseDto> {
    return await this.createTenantUsecase.execute(
      CreateTenantCommand.create({
        userId: user._id,
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        identifier: body.identifier,
        name: body.name,
        data: body.data,
      })
    );
  }

  @Patch('/:identifier')
  @ExternalApiAccessible()
  @ApiResponse(UpdateTenantResponseDto)
  @ApiOperation({
    summary: 'Update tenant',
    description: 'Update tenant by your internal id used to identify the tenant',
  })
  @ApiNotFoundResponse({
    description: 'The tenant with the identifier provided does not exist in the database.',
  })
  async updateTenant(
    @UserSession() user: UserSessionData,
    @Param('identifier') identifier: string,
    @Body() body: UpdateTenantRequestDto
  ): Promise<UpdateTenantResponseDto> {
    return await this.updateTenantUsecase.execute(
      UpdateTenantCommand.create({
        userId: user._id,
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
  @UserAuthentication()
  @ApiOperation({
    summary: 'Delete tenant',
    description: 'Deletes a tenant entity from the Novu platform',
  })
  @ApiNoContentResponse({
    description: 'The tenant has been deleted correctly',
  })
  @ApiNotFoundResponse({
    description: 'The tenant with the identifier provided does not exist in the database so it can not be deleted.',
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeTenant(@UserSession() user: UserSessionData, @Param('identifier') identifier: string): Promise<void> {
    return await this.deleteTenantUsecase.execute(
      DeleteTenantCommand.create({
        userId: user._id,
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        identifier: identifier,
      })
    );
  }
}
