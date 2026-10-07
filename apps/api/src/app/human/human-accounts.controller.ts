import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';
import { ApiExcludeController, ApiOperation } from '@nestjs/swagger';
import { ApiRateLimitCategoryEnum } from '@novu/shared';
import { ThrottlerCategory } from '../rate-limiting/guards';
import { ApiCommonResponses } from '../shared/framework/response.decorator';
import {
  ApproveHumanCliLoginRequestDto,
  ClaimHumanAccountRequestDto,
  EnsureHumanAccountRequestDto,
  type HumanAccountClaimResponseDto,
  type HumanAccountCliLoginResponseDto,
  type HumanAccountResponseDto,
  type HumanAccountSecretKeyResponseDto,
} from './dtos/human-account.dto';
import { HumanDashboardSecretGuard } from './guards/human-dashboard-secret.guard';
import { ApproveHumanCliLoginCommand } from './usecases/approve-human-cli-login/approve-human-cli-login.command';
import { ApproveHumanCliLogin } from './usecases/approve-human-cli-login/approve-human-cli-login.usecase';
import { ClaimForHumanAccountCommand } from './usecases/claim-for-human-account/claim-for-human-account.command';
import { ClaimForHumanAccount } from './usecases/claim-for-human-account/claim-for-human-account.usecase';
import { DeleteHumanAccountCommand } from './usecases/delete-human-account/delete-human-account.command';
import { DeleteHumanAccount } from './usecases/delete-human-account/delete-human-account.usecase';
import { EnsureBackingOrganizationCommand } from './usecases/ensure-backing-organization/ensure-backing-organization.command';
import { EnsureBackingOrganization } from './usecases/ensure-backing-organization/ensure-backing-organization.usecase';
import { GetBackingSecretKeyCommand } from './usecases/get-backing-secret-key/get-backing-secret-key.command';
import { GetBackingSecretKey } from './usecases/get-backing-secret-key/get-backing-secret-key.usecase';

/**
 * Private endpoints for the Human dashboard's server (gethuman.md), which signs operators in with its
 * own Clerk app. Each Human account is backed by a hidden Novu organization; see
 * packages/human/docs/adr/0001-separate-clerk-app-with-backing-organizations.md.
 */
@ThrottlerCategory(ApiRateLimitCategoryEnum.CONFIGURATION)
@ApiCommonResponses()
@Controller('/human/accounts')
@ApiExcludeController()
@UseGuards(HumanDashboardSecretGuard)
export class HumanAccountsController {
  constructor(
    private readonly ensureBackingOrganizationUsecase: EnsureBackingOrganization,
    private readonly claimForHumanAccountUsecase: ClaimForHumanAccount,
    private readonly getBackingSecretKeyUsecase: GetBackingSecretKey,
    private readonly deleteHumanAccountUsecase: DeleteHumanAccount,
    private readonly approveHumanCliLoginUsecase: ApproveHumanCliLogin
  ) {}

  @Post('/')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Create the backing organization of a Human account, or return the existing one' })
  ensure(@Body() body: EnsureHumanAccountRequestDto): Promise<HumanAccountResponseDto> {
    return this.ensureBackingOrganizationUsecase.execute(
      EnsureBackingOrganizationCommand.create({
        humanUserId: body.humanUserId,
        firstName: body.firstName,
        lastName: body.lastName,
      })
    );
  }

  @Post('/claim')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Move a keyless setup into the backing organization of a Human account' })
  claim(@Body() body: ClaimHumanAccountRequestDto): Promise<HumanAccountClaimResponseDto> {
    return this.claimForHumanAccountUsecase.execute(
      ClaimForHumanAccountCommand.create({
        humanUserId: body.humanUserId,
        firstName: body.firstName,
        lastName: body.lastName,
        token: body.token,
      })
    );
  }

  @Post('/cli-login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Approve a `human login` with the Development key of a Human account, keeping its keyless setup',
  })
  approveCliLogin(@Body() body: ApproveHumanCliLoginRequestDto): Promise<HumanAccountCliLoginResponseDto> {
    return this.approveHumanCliLoginUsecase.execute(
      ApproveHumanCliLoginCommand.create({
        humanUserId: body.humanUserId,
        firstName: body.firstName,
        lastName: body.lastName,
        email: body.email,
        userCode: body.userCode,
        claimToken: body.claimToken,
      })
    );
  }

  @Get('/:humanUserId/secret-key')
  @ApiOperation({ summary: 'Get the Development environment secret key of a Human account' })
  getSecretKey(@Param('humanUserId') humanUserId: string): Promise<HumanAccountSecretKeyResponseDto> {
    return this.getBackingSecretKeyUsecase.execute(GetBackingSecretKeyCommand.create({ humanUserId }));
  }

  @Delete('/:humanUserId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete the backing organization of a Human account' })
  async delete(@Param('humanUserId') humanUserId: string): Promise<void> {
    await this.deleteHumanAccountUsecase.execute(DeleteHumanAccountCommand.create({ humanUserId }));
  }
}
