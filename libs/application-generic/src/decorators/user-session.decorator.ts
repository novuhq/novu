import {
  InternalServerErrorException,
  Logger,
  createParamDecorator,
} from '@nestjs/common';

export const UserSession = createParamDecorator((data, ctx) => {
  let req;
  if (ctx.getType() === 'graphql') {
    req = ctx.getArgs()[2].req;
  } else {
    req = ctx.switchToHttp().getRequest();
  }

  if (req.user) {
    return req.user;
  }

  Logger.error(
    'Attempted to access user session without a user in the request. You probably forgot to add the AuthGuard',
    'UserSession',
  );
  throw new InternalServerErrorException();
});
