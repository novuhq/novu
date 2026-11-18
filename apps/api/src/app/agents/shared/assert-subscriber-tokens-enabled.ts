import { ForbiddenException } from '@nestjs/common';
import { FeatureFlagsService } from '@novu/application-generic';
import { FeatureFlagsKeysEnum } from '@novu/shared';

export async function isSubscriberTokensEnabled(args: {
  featureFlagsService: Pick<FeatureFlagsService, 'getFlag'>;
  environmentId: string;
  organizationId: string;
}): Promise<boolean> {
  return args.featureFlagsService.getFlag({
    key: FeatureFlagsKeysEnum.IS_SUBSCRIBER_TOKENS_ENABLED,
    defaultValue: false,
    environment: { _id: args.environmentId },
    organization: { _id: args.organizationId },
  });
}

export async function assertSubscriberTokensEnabled(args: {
  featureFlagsService: FeatureFlagsService;
  environmentId: string;
  organizationId: string;
}): Promise<void> {
  const enabled = await isSubscriberTokensEnabled(args);

  if (!enabled) {
    throw new ForbiddenException({
      statusCode: 403,
      message: 'Subscriber access rules are not enabled for this organization.',
      error: 'subscriber_tokens_disabled',
    });
  }
}
