import { createParamDecorator, UnauthorizedException } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';

// eslint-disable-next-line @typescript-eslint/naming-convention
export const UserSession = createParamDecorator((data, ctx) => {
  let req;

  if (ctx.getType() === 'graphql') {
    req = ctx.getArgs()[2].req;
  } else {
    req = ctx.switchToHttp().getRequest();
  }

  if (req.user) return req.user;

  if (req.headers) {
    if (req.headers.authorization) {
      const tokenParts = req.headers.authorization.split(' ');

      if (tokenParts[0] !== 'Bearer') throw new UnauthorizedException('bad_token');
      if (!tokenParts[1]) throw new UnauthorizedException('bad_token');

      const user = jwt.decode(tokenParts[1]);

      return user;
    }
  }

  return null;
});

// eslint-disable-next-line @typescript-eslint/naming-convention
export const SubscriberSession = createParamDecorator((data, ctx) => {
  let req;

  if (ctx.getType() === 'graphql') {
    req = ctx.getArgs()[2].req;
  } else {
    req = ctx.switchToHttp().getRequest();
  }

  if (req.user) return req.user;
  if (req.headers) {
    if (req.headers.authorization) {
      const tokenParts = req.headers.authorization.split(' ');

      if (tokenParts[0] !== 'Bearer') throw new UnauthorizedException('bad_token');
      if (!tokenParts[1]) throw new UnauthorizedException('bad_token');

      const user = jwt.decode(tokenParts[1]);

      return user;
    }
  }

  return null;
});
