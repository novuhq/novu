import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { generateTransactionId } from '../helpers';

export interface RequestWithTransactionId extends Request {
  _transactionId?: string;
}

@Injectable()
export class TransactionIdMiddleware implements NestMiddleware {
  use(req: RequestWithTransactionId, _res: Response, next: NextFunction) {
    // Only check body transaction ID for /events/trigger/* routes
    const isEventsTriggerRoute = req.path.startsWith('/events/trigger/');
    const bodyTransactionId = isEventsTriggerRoute ? req.body?.transactionId : undefined;

    // Use provided transaction ID (only for events routes) or generate a new one
    req._transactionId = bodyTransactionId || generateTransactionId();

    next();
  }
}
