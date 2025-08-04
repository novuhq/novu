import {
  BadRequestException,
  Body,
  ClassSerializerInterceptor,
  Controller,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiExcludeController, ApiTags } from '@nestjs/swagger';
import { buildOauthRedirectUrl, PinoLogger } from '@novu/application-generic';
import { MemberEntity, MemberRepository, UserRepository } from '@novu/dal';
import { PasswordResetFlowEnum, UserSessionData } from '@novu/shared';
import { ApiCommonResponses } from '../shared/framework/response.decorator';
import { UserSession } from '../shared/framework/user.decorator';
import { LoginBodyDto } from './dtos/login.dto';
import { PasswordResetBodyDto, PasswordResetRequestBodyDto } from './dtos/password-reset.dto';
import { UpdatePasswordBodyDto } from './dtos/update-password.dto';
import { UserRegistrationBodyDto } from './dtos/user-registration.dto';
import { RequireAuthentication } from './framework/auth.decorator';
import { AuthService } from './services/auth.service';
import { LoginCommand } from './usecases/login/login.command';
import { Login } from './usecases/login/login.usecase';
import { PasswordResetCommand } from './usecases/password-reset/password-reset.command';
import { PasswordReset } from './usecases/password-reset/password-reset.usecase';
import { PasswordResetRequestCommand } from './usecases/password-reset-request/password-reset-request.command';
import { PasswordResetRequest } from './usecases/password-reset-request/password-reset-request.usecase';
import { UserRegisterCommand } from './usecases/register/user-register.command';
import { UserRegister } from './usecases/register/user-register.usecase';
import { SwitchOrganizationCommand } from './usecases/switch-organization/switch-organization.command';
import { SwitchOrganization } from './usecases/switch-organization/switch-organization.usecase';
import { UpdatePasswordCommand } from './usecases/update-password/update-password.command';
import { UpdatePassword } from './usecases/update-password/update-password.usecase';

@ApiCommonResponses()
@Controller('/auth')
@UseInterceptors(ClassSerializerInterceptor)
@ApiTags('Auth')
@ApiExcludeController()
export class AuthController {
  constructor(
    private userRepository: UserRepository,
    private authService: AuthService,
    private userRegisterUsecase: UserRegister,
    private loginUsecase: Login,
    private switchOrganizationUsecase: SwitchOrganization,
    private memberRepository: MemberRepository,
    private passwordResetRequestUsecase: PasswordResetRequest,
    private passwordResetUsecase: PasswordReset,
    private updatePasswordUsecase: UpdatePassword,
    private logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  @Get('/github')
  githubAuth() {
    this.logger.trace('Checking Github Auth');

    if (!process.env.GITHUB_OAUTH_CLIENT_ID || !process.env.GITHUB_OAUTH_CLIENT_SECRET) {
      throw new BadRequestException(
        'GitHub auth is not configured, please provide GITHUB_OAUTH_CLIENT_ID and GITHUB_OAUTH_CLIENT_SECRET as env variables'
      );
    }

    this.logger.trace('Github Auth has all variables.');

    return {
      success: true,
    };
  }

  @Get('/github/callback')
  @UseGuards(AuthGuard('github'))
  async githubCallback(@Req() request, @Res() response) {
    const url = buildOauthRedirectUrl(request);

    return response.redirect(url);
  }

  @Get('/refresh')
  @RequireAuthentication()
  @Header('Cache-Control', 'no-store')
  refreshToken(@UserSession() user: UserSessionData) {
    if (!user || !user._id) throw new BadRequestException();

    return this.authService.refreshToken(user._id);
  }

  @Post('/register')
  @Header('Cache-Control', 'no-store')
  async userRegistration(@Body() body: UserRegistrationBodyDto) {
    return await this.userRegisterUsecase.execute(
      UserRegisterCommand.create({
        email: body.email,
        password: body.password,
        firstName: body.firstName,
        lastName: body.lastName,
        organizationName: body.organizationName,
        origin: body.origin,
        jobTitle: body.jobTitle,
        domain: body.domain,
        productUseCases: body.productUseCases,
        wasInvited: !!body.invitationToken,
      })
    );
  }

  @Post('/reset/request')
  async forgotPasswordRequest(@Body() body: PasswordResetRequestBodyDto, @Query('src') src?: string) {
    return await this.passwordResetRequestUsecase.execute(
      PasswordResetRequestCommand.create({
        email: body.email,
        src: src as PasswordResetFlowEnum,
      })
    );
  }

  @Post('/reset')
  async passwordReset(@Body() body: PasswordResetBodyDto) {
    return await this.passwordResetUsecase.execute(
      PasswordResetCommand.create({
        password: body.password,
        token: body.token,
      })
    );
  }

  @Post('/login')
  @Header('Cache-Control', 'no-store')
  async userLogin(@Body() body: LoginBodyDto) {
    return await this.loginUsecase.execute(
      LoginCommand.create({
        email: body.email,
        password: body.password,
      })
    );
  }

  @Post('/organizations/:organizationId/switch')
  @RequireAuthentication()
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  async organizationSwitch(@UserSession() user: UserSessionData, @Param('organizationId') organizationId: string) {
    const command = SwitchOrganizationCommand.create({
      userId: user._id,
      newOrganizationId: organizationId,
    });

    return this.switchOrganizationUsecase.execute(command);
  }

  @Post('/update-password')
  @Header('Cache-Control', 'no-store')
  @RequireAuthentication()
  @HttpCode(HttpStatus.NO_CONTENT)
  async updatePassword(@UserSession() user: UserSessionData, @Body() body: UpdatePasswordBodyDto) {
    return await this.updatePasswordUsecase.execute(
      UpdatePasswordCommand.create({
        userId: user._id,
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        currentPassword: body.currentPassword,
        newPassword: body.newPassword,
        confirmPassword: body.confirmPassword,
      })
    );
  }

  @Get('/test/token/:userId')
  async authenticateTest(@Param('userId') userId: string, @Query('organizationId') organizationId: string) {
    if (process.env.NODE_ENV !== 'test') throw new NotFoundException();

    const user = await this.userRepository.findById(userId);
    if (!user) throw new BadRequestException('No user found');

    const member = organizationId ? await this.memberRepository.findMemberByUserId(organizationId, user._id) : null;

    return await this.authService.getSignedToken(user, organizationId, member as MemberEntity);
  }
}
