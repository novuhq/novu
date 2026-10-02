import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CommunityOrganizationRepository, OrganizationEntity } from '@novu/dal';
import { ApiServiceLevelEnum, FeatureNameEnum, getFeatureForTierAsNumber } from '@novu/shared';

interface ResolveActivityRetentionRangeOptions {
  organizationId: string;
  after?: string;
  before?: string;
}

export interface ActivityRetentionRange {
  after?: string;
  before?: string;
}

type ActivityRetentionPolicy = { kind: 'unlimited' } | { kind: 'limited'; durationMs: number };

function parseAndValidateDate(dateString: string, parameterName: string): Date {
  const parsedDate = new Date(dateString);

  if (Number.isNaN(parsedDate.getTime())) {
    throw new HttpException(
      `Invalid date format for parameter '${parameterName}': ${dateString}. Please provide a valid ISO 8601 date string.`,
      HttpStatus.BAD_REQUEST
    );
  }

  return parsedDate;
}

function assertValidChronology(after?: Date, before?: Date) {
  if (after && before && after > before) {
    throw new HttpException(
      'Invalid date range: start date (after) must be earlier than end date (before)',
      HttpStatus.BAD_REQUEST
    );
  }
}

function getActivityRetentionPolicy(organization: OrganizationEntity): ActivityRetentionPolicy {
  if (process.env.IS_SELF_HOSTED === 'true') {
    return { kind: 'unlimited' };
  }

  const { apiServiceLevel, createdAt } = organization;
  if (apiServiceLevel === ApiServiceLevelEnum.FREE && new Date(createdAt) < new Date('2025-02-28')) {
    return { kind: 'limited', durationMs: 30 * 24 * 60 * 60 * 1000 };
  }

  return {
    kind: 'limited',
    durationMs: getFeatureForTierAsNumber(
      FeatureNameEnum.PLATFORM_ACTIVITY_FEED_RETENTION,
      apiServiceLevel ?? ApiServiceLevelEnum.FREE,
      true
    ),
  };
}

@Injectable()
export class ActivityRetentionService {
  constructor(private organizationRepository: CommunityOrganizationRepository) {}

  async resolve({
    organizationId,
    after,
    before,
  }: ResolveActivityRetentionRangeOptions): Promise<ActivityRetentionRange> {
    const organization = await this.organizationRepository.findById(organizationId);
    if (!organization) {
      throw new HttpException('Organization not found', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    const policy = getActivityRetentionPolicy(organization);
    const effectiveAfterDate = after ? parseAndValidateDate(after, 'after') : undefined;
    const effectiveBeforeDate = before ? parseAndValidateDate(before, 'before') : undefined;

    assertValidChronology(effectiveAfterDate, effectiveBeforeDate);

    if (policy.kind === 'unlimited') {
      return {
        after: effectiveAfterDate?.toISOString(),
        before: effectiveBeforeDate?.toISOString(),
      };
    }

    const earliestAllowedDate = new Date(Date.now() - policy.durationMs);
    const resolvedAfterDate = effectiveAfterDate ?? earliestAllowedDate;
    const resolvedBeforeDate = effectiveBeforeDate ?? new Date();

    assertValidChronology(resolvedAfterDate, resolvedBeforeDate);

    const oneHourBufferMs = 60 * 60 * 1000;
    const bufferedEarliestAllowedDate = new Date(earliestAllowedDate.getTime() - oneHourBufferMs);

    if (
      process.env.NODE_ENV !== 'local' &&
      (resolvedAfterDate < bufferedEarliestAllowedDate || resolvedBeforeDate < bufferedEarliestAllowedDate)
    ) {
      throw new HttpException(
        `Requested date range exceeds your plan's retention period. ` +
          `The earliest accessible date for your plan is ${earliestAllowedDate.toISOString().split('T')[0]}. ` +
          `Please upgrade your plan to access older activities.`,
        HttpStatus.PAYMENT_REQUIRED
      );
    }

    return {
      after: resolvedAfterDate.toISOString(),
      before: resolvedBeforeDate.toISOString(),
    };
  }
}
