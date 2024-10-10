import { Injectable, Inject } from '@nestjs/common';
import type { Request, Response } from 'express';

import { NovuRequestHandler, type ServeHandlerOptions } from '../../handler';
import type { SupportedFrameworkName } from '../../types';
import { NOVU_OPTIONS } from './nest.constants';
import { NovuHandler } from './nest.handler';

export const frameworkName: SupportedFrameworkName = 'nest';

@Injectable()
export class NovuClient {
  public novuRequestHandler: NovuRequestHandler;

  constructor(
    @Inject(NOVU_OPTIONS) private options: ServeHandlerOptions,
    @Inject(NovuHandler) private novuHandler: NovuHandler
  ) {
    this.novuRequestHandler = new NovuRequestHandler({
      frameworkName,
      ...this.options,
      handler: this.novuHandler.handler,
    });
  }

  public async handleRequest(req: Request, res: Response) {
    await this.novuRequestHandler.createHandler()(req, res);
  }
}
