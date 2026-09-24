import { HttpException, HttpStatus } from '@nestjs/common';
import { OrganizationEntity } from '@novu/dal';
import { ApiServiceLevelEnum, FeatureNameEnum, getFeatureForTierAsNumber } from '@novu/shared';

interface ValidateActivityRetentionRangeOptions {
  organization: OrganizationEntity;
  after?: string;
  before?: string;
}

interface ActivityRetentionRange {
  after?: string;
  before?: string;
}

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

function getMaxRetentionPeriodByOrganization(organization: OrganizationEntity) {
  if (process.env.IS_SELF_HOSTED === 'true') {
    return Number.MAX_SAFE_INTEGER;
  }

  const { apiServiceLevel, createdAt } = organization;
  if (apiServiceLevel === ApiServiceLevelEnum.FREE && new Date(createdAt) < new Date('2025-02-28')) {
    return 30 * 24 * 60 * 60 * 1000;
  }

  return getFeatureForTierAsNumber(
    FeatureNameEnum.PLATFORM_ACTIVITY_FEED_RETENTION,
    apiServiceLevel ?? ApiServiceLevelEnum.FREE,
    true
  );
}

export function validateActivityRetentionRange({
  organization,
  after,
  before,
}: ValidateActivityRetentionRangeOptions): ActivityRetentionRange {
  const maxRetentionMs = getMaxRetentionPeriodByOrganization(organization);

  if (maxRetentionMs === Number.MAX_SAFE_INTEGER) {
    const effectiveAfterDate = after ? parseAndValidateDate(after, 'after') : undefined;
    const effectiveBeforeDate = before ? parseAndValidateDate(before, 'before') : undefined;

    if (effectiveAfterDate && effectiveBeforeDate && effectiveAfterDate > effectiveBeforeDate) {
      throw new HttpException(
        'Invalid date range: start date (after) must be earlier than end date (before)',
        HttpStatus.BAD_REQUEST
      );
    }

    return {
      after: effectiveAfterDate?.toISOString(),
      before: effectiveBeforeDate?.toISOString(),
    };
  }

  const earliestAllowedDate = new Date(Date.now() - maxRetentionMs);
  const effectiveAfterDate = after ? parseAndValidateDate(after, 'after') : earliestAllowedDate;
  const effectiveBeforeDate = before ? parseAndValidateDate(before, 'before') : new Date();

  if (effectiveAfterDate > effectiveBeforeDate) {
    throw new HttpException(
      'Invalid date range: start date (after) must be earlier than end date (before)',
      HttpStatus.BAD_REQUEST
    );
  }

  const oneHourBufferMs = 60 * 60 * 1000;
  const bufferedEarliestAllowedDate = new Date(earliestAllowedDate.getTime() - oneHourBufferMs);

  if (
    process.env.NODE_ENV !== 'local' &&
    (effectiveAfterDate < bufferedEarliestAllowedDate || effectiveBeforeDate < bufferedEarliestAllowedDate)
  ) {
    throw new HttpException(
      `Requested date range exceeds your plan's retention period. ` +
        `The earliest accessible date for your plan is ${earliestAllowedDate.toISOString().split('T')[0]}. ` +
        `Please upgrade your plan to access older activities.`,
      HttpStatus.PAYMENT_REQUIRED
    );
  }

  return {
    after: effectiveAfterDate.toISOString(),
    before: effectiveBeforeDate.toISOString(),
  };
}
