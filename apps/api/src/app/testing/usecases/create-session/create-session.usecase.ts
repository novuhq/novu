import { Injectable } from '@nestjs/common';
import { UserSession } from '@novu/testing';
import { CreateSessionCommand } from './create-session.command';

@Injectable()
export class CreateSession {
  async execute(command: CreateSessionCommand) {
    const userSession = new UserSession();

    userSession.testServer = null;
    await userSession.initialize();

    return {
      token: userSession.token,
      user: userSession.user,
    };
  }
}
