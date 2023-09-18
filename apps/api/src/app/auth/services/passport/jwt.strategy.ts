import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { IJwtPayload } from '@novu/shared';
import { AuthService, Instrument, PinoLogger } from '@novu/application-generic';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly authService: AuthService, private logger: PinoLogger) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET,
    });
  }

  @Instrument()
  async validate(payload: IJwtPayload) {
    const user = await this.authService.validateUser(payload);
    if (!user) {
      throw new UnauthorizedException();
    }

    this.logger.assign({
      userId: user._id,
      environmentId: payload.environmentId,
      organizationId: payload.organizationId,
    });

    return payload;
  }
}
