import crypto from 'node:crypto';
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Observable } from 'rxjs';
import { areHexDigestsEqual } from '../../shared/helpers/timing-safe-equal';
import { getRequestHeaderValue } from '../../shared/helpers/get-request-header-value';

@Injectable()
export class PlainCardsGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();

    const requestBody = JSON.stringify(request.body);
    const plainCardsHMACSecretKey = process.env.PLAIN_CARDS_HMAC_SECRET_KEY as string;
    const incomingSignature = getRequestHeaderValue(request.headers['plain-request-signature']);
    if (!incomingSignature) throw new UnauthorizedException('Plain request signature is missing');
    const expectedSignature = crypto.createHmac('sha-256', plainCardsHMACSecretKey).update(requestBody).digest('hex');

    return areHexDigestsEqual(expectedSignature, incomingSignature);
  }
}
