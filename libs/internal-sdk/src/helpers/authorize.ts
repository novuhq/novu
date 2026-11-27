import { NovuCore } from '../core.js';
import { subscribersTokensCreate } from '../funcs/subscribersTokensCreate.js';
import { BaseSubscriberFieldsDto } from '../models/components/basesubscriberfieldsdto.js';
import { CreateSubscriberTokenRequestDto } from '../models/components/createsubscribertokenrequestdto.js';
import { unwrapAsync } from '../types/fp.js';

export type AuthorizeOptions = {
  subscriber: { subscriberId: string } & BaseSubscriberFieldsDto;
  context?: CreateSubscriberTokenRequestDto['context'];
  scope?: CreateSubscriberTokenRequestDto['scope'];
  expiresIn?: CreateSubscriberTokenRequestDto['expiresIn'];
};

export type AuthorizeResult = {
  status: 200;
  body: { token: string; expiresAt: string };
};

/**
 * Mints a subscriber login token for the browser SDK's token route.
 *
 * @example
 * // app/api/novu/route.ts
 * export async function POST() {
 *   const user = await getCurrentUser();
 *   const { status, body } = await authorize(novu, {
 *     subscriber: { subscriberId: user.id, email: user.email },
 *   });
 *   return Response.json(body, { status });
 * }
 */
export async function authorize(novu: NovuCore, options: AuthorizeOptions): Promise<AuthorizeResult> {
  const {
    subscriber: { subscriberId, ...profile },
    context,
    scope,
    expiresIn,
  } = options;
  const request: CreateSubscriberTokenRequestDto = {
    ...(Object.keys(profile).length > 0 && { subscriber: profile }),
    ...(context !== undefined && { context }),
    ...(scope !== undefined && { scope }),
    ...(expiresIn !== undefined && { expiresIn }),
  };

  const { result } = await unwrapAsync(subscribersTokensCreate(novu, request, subscriberId));

  return {
    status: 200,
    body: { token: result.token, expiresAt: result.expiresAt.toISOString() },
  };
}
