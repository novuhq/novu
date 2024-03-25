import {
  BadRequestException,
  Body,
  ClassSerializerInterceptor,
  Controller,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
  UseInterceptors,
  Logger,
  Header,
  HttpStatus,
} from '@nestjs/common';
import { MemberRepository, OrganizationRepository, UserRepository, MemberEntity } from '@novu/dal';
import { AuthGuard } from '@nestjs/passport';
import { IJwtPayload, PasswordResetFlowEnum } from '@novu/shared';
import { UserRegistrationBodyDto } from './dtos/user-registration.dto';
import { UserRegister } from './usecases/register/user-register.usecase';
import { UserRegisterCommand } from './usecases/register/user-register.command';
import { Login } from './usecases/login/login.usecase';
import { LoginBodyDto } from './dtos/login.dto';
import { LoginCommand } from './usecases/login/login.command';
import { UserSession } from '../shared/framework/user.decorator';
import { UserAuthGuard } from './framework/user.auth.guard';
import { PasswordResetRequestCommand } from './usecases/password-reset-request/password-reset-request.command';
import { PasswordResetRequest } from './usecases/password-reset-request/password-reset-request.usecase';
import { PasswordResetCommand } from './usecases/password-reset/password-reset.command';
import { PasswordReset } from './usecases/password-reset/password-reset.usecase';
import { ApiException } from '../shared/exceptions/api.exception';
import { ApiExcludeController, ApiTags } from '@nestjs/swagger';
import { PasswordResetBodyDto } from './dtos/password-reset.dto';
import {
  AuthService,
  buildOauthRedirectUrl,
  SwitchEnvironment,
  SwitchEnvironmentCommand,
  SwitchOrganization,
  SwitchOrganizationCommand,
} from '@novu/application-generic';
import { ApiCommonResponses } from '../shared/framework/response.decorator';
import { UpdatePasswordBodyDto } from './dtos/update-password.dto';
import { UpdatePassword } from './usecases/update-password/update-password.usecase';
import { UpdatePasswordCommand } from './usecases/update-password/update-password.command';

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
    private organizationRepository: OrganizationRepository,
    private switchEnvironmentUsecase: SwitchEnvironment,
    private switchOrganizationUsecase: SwitchOrganization,
    private memberRepository: MemberRepository,
    private passwordResetRequestUsecase: PasswordResetRequest,
    private passwordResetUsecase: PasswordReset,
    private updatePasswordUsecase: UpdatePassword
  ) {}

  @Get('/github')
  githubAuth() {
    Logger.verbose('Checking Github Auth');

    if (!process.env.GITHUB_OAUTH_CLIENT_ID || !process.env.GITHUB_OAUTH_CLIENT_SECRET) {
      throw new ApiException(
        'GitHub auth is not configured, please provide GITHUB_OAUTH_CLIENT_ID and GITHUB_OAUTH_CLIENT_SECRET as env variables'
      );
    }

    Logger.verbose('Github Auth has all variables.');

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
  @UseGuards(UserAuthGuard)
  @Header('Cache-Control', 'no-store')
  refreshToken(@UserSession() user: IJwtPayload) {
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
      })
    );
  }

  @Post('/reset/request')
  async forgotPasswordRequest(@Body() body: { email: string }, @Query('src') src?: PasswordResetFlowEnum) {
    return await this.passwordResetRequestUsecase.execute(
      PasswordResetRequestCommand.create({
        email: body.email,
        src,
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
  @UseGuards(UserAuthGuard)
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  async organizationSwitch(
    @UserSession() user: IJwtPayload,
    @Param('organizationId') organizationId: string
  ): Promise<string> {
    const command = SwitchOrganizationCommand.create({
      userId: user._id,
      newOrganizationId: organizationId,
    });

    return await this.switchOrganizationUsecase.execute(command);
  }

  @Post('/environments/:environmentId/switch')
  @Header('Cache-Control', 'no-store')
  @UseGuards(UserAuthGuard)
  @HttpCode(200)
  async projectSwitch(
    @UserSession() user: IJwtPayload,
    @Param('environmentId') environmentId: string
  ): Promise<{ token: string }> {
    const command = SwitchEnvironmentCommand.create({
      userId: user._id,
      newEnvironmentId: environmentId,
      organizationId: user.organizationId,
    });

    return {
      token: await this.switchEnvironmentUsecase.execute(command),
    };
  }

  @Post('/update-password')
  @Header('Cache-Control', 'no-store')
  @UseGuards(UserAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async updatePassword(@UserSession() user: IJwtPayload, @Body() body: UpdatePasswordBodyDto) {
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
  async authenticateTest(
    @Param('userId') userId: string,
    @Query('organizationId') organizationId: string,
    @Query('environmentId') environmentId: string
  ) {
    if (process.env.NODE_ENV !== 'test') throw new NotFoundException();

    const user = await this.userRepository.findById(userId);
    if (!user) throw new BadRequestException('No user found');

    const member = organizationId ? await this.memberRepository.findMemberByUserId(organizationId, user._id) : null;

    return await this.authService.getSignedToken(user, organizationId, member as MemberEntity, environmentId);
  }
}
