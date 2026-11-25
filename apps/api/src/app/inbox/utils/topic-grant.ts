import { ForbiddenException } from '@nestjs/common';
import { TokenVerification } from '../../shared/services/novu-tokens.service';

export interface TopicGrantRequest {
  environmentId: string;
  subscriberId: string;
  topicKey: string;
}

function topicGrantError(error: 'topic_grant_expired' | 'topic_grant_invalid', message: string): ForbiddenException {
  return new ForbiddenException({ statusCode: 403, message, error });
}

export function assertTopicGrant(verification: TokenVerification, request: TopicGrantRequest): void {
  if (!verification.ok && verification.reason === 'expired') {
    throw topicGrantError('topic_grant_expired', 'The topic grant has expired.');
  }

  const claims = verification.ok ? verification.claims : undefined;
  if (
    claims?.aud !== 'novu' ||
    claims.iss !== request.environmentId ||
    claims.sub !== request.subscriberId ||
    claims.topic !== request.topicKey
  ) {
    throw topicGrantError('topic_grant_invalid', 'The topic grant does not allow this subscription.');
  }
}
