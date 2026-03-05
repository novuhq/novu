import { Injectable, NotFoundException } from '@nestjs/common';
import { ActionProviderIdEnum } from '@novu/shared';
import { HttpActionHandler } from './handlers';
import { IActionHandler } from './interfaces';

@Injectable()
export class ActionHandlerFactory {
  private readonly handlers: Map<string, IActionHandler>;

  constructor() {
    const httpHandler = new HttpActionHandler();

    this.handlers = new Map<string, IActionHandler>([[ActionProviderIdEnum.HttpRequest, httpHandler]]);
  }

  getHandler(providerId: string): IActionHandler {
    const handler = this.handlers.get(providerId);

    if (!handler) {
      throw new NotFoundException(`No action handler registered for provider: '${providerId}'`);
    }

    return handler;
  }

  isSupported(providerId: string): boolean {
    return this.handlers.has(providerId);
  }
}
