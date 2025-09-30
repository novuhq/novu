import crypto from 'node:crypto';
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class PlainCardsGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();

    const requestBody = JSON.stringify(request.body);
    const plainCardsHMACSecretKey = process.env.PLAIN_CARDS_HMAC_SECRET_KEY as string;
    const incomingSignature = request.headers['plain-request-signature'];
    if (!incomingSignature) throw new UnauthorizedException('Plain request signature is missing');
    const expectedSignature = crypto.createHmac('sha-256', plainCardsHMACSecretKey).update(requestBody).digest('hex');

    return incomingSignature === expectedSignature;
  }
}
