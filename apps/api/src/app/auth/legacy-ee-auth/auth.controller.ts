import {
  ClassSerializerInterceptor,
  Controller,
  Get,
  Req,
  Res,
  UseGuards,
  UseInterceptors,
  Logger,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

import { ApiException, buildOauthRedirectUrl } from '@novu/application-generic';

@Controller('/auth')
@UseInterceptors(ClassSerializerInterceptor)
export class AuthController {
  @Get('/google')
  googleAuth() {
    Logger.verbose('Checking Google Auth');

    if (!process.env.GOOGLE_OAUTH_CLIENT_ID || !process.env.GOOGLE_OAUTH_CLIENT_SECRET) {
      throw new ApiException(
        'Google auth is not configured, please provide GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET as env variables'
      );
    }

    Logger.verbose('Google Auth has all variables.');

    return {
      success: true,
    };
  }

  @Get('/google/callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(@Req() request, @Res() response) {
    const url = buildOauthRedirectUrl(request);

    return response.redirect(url);
  }
}
