import { Injectable, NestMiddleware } from '@nestjs/common';
import { generateObjectId } from '@novu/application-generic';
import { NextFunction, Request, Response } from 'express';

export interface RequestWithReqId extends Request {
  _nvRequestId: string;
}

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: RequestWithReqId, _res: Response, next: NextFunction) {
    req._nvRequestId = `req_${generateObjectId()}`;

    next();
  }
}
