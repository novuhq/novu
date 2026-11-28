import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CommunityOrganizationRepository, OrganizationEntity } from '@novu/dal';
import { ApiServiceLevelEnum, FeatureNameEnum, getFeatureForTierAsNumber } from '@novu/shared';

interface ResolveActivityRetentionRangeOptions {
  organizationId: string;
  after?: string;
  before?: string;
}

type ResolveActivityRetentionStartOptions = Pick<ResolveActivityRetentionRangeOptions, 'organizationId' | 'after'>;

interface AssertWithinActivityRetentionOptions {
  organizationId: string;
  createdAt: Date;
}

export interface ActivityRetentionRange {
  after?: string;
  before?: string;
}

type ActivityRetentionPolicy = { kind: 'unlimited' } | { kind: 'limited'; durationMs: number };

/** A local calendar week is one hour longer across a daylight-saving fallback. */
const RETENTION_DST_BUFFER_MS = 60 * 60 * 1000;

/** The server clock is later than the client stamp by the time the request arrives. */
const RETENTION_REQUEST_DELAY_MS = 60 * 1000;

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

function isBeforeRetentionWindow(date: Date, earliestAllowedDate: Date): boolean {
  if (process.env.NODE_ENV === 'local') {
    return false;
  }

  const bufferedEarliestAllowedDate = new Date(
    earliestAllowedDate.getTime() - RETENTION_DST_BUFFER_MS - RETENTION_REQUEST_DELAY_MS
  );

  return date < bufferedEarliestAllowedDate;
}

const RANGE_EXCEEDS_RETENTION = "Requested date range exceeds your plan's retention period.";
const RECORD_EXCEEDS_RETENTION = "This activity is older than your plan's retention period.";

function retentionExceeded(reason: string, earliestAllowedDate: Date): HttpException {
  return new HttpException(
    `${reason} ` +
      `The earliest accessible date for your plan is ${earliestAllowedDate.toISOString().split('T')[0]}. ` +
      `Please upgrade your plan to access older activities.`,
    HttpStatus.PAYMENT_REQUIRED
  );
}

@Injectable()
export class ActivityRetentionService {
  constructor(private organizationRepository: CommunityOrganizationRepository) {}

  async resolve({
    organizationId,
    after,
    before,
  }: ResolveActivityRetentionRangeOptions): Promise<ActivityRetentionRange> {
    const policy = await this.getPolicy(organizationId);
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

    if (
      isBeforeRetentionWindow(resolvedAfterDate, earliestAllowedDate) ||
      isBeforeRetentionWindow(resolvedBeforeDate, earliestAllowedDate)
    ) {
      throw retentionExceeded(RANGE_EXCEEDS_RETENTION, earliestAllowedDate);
    }

    return {
      after: resolvedAfterDate.toISOString(),
      before: resolvedBeforeDate.toISOString(),
    };
  }

  /** For endpoints that filter by a start date only: no end date is implied, so a start in the future is not an error. */
  async resolveAfter({ organizationId, after }: ResolveActivityRetentionStartOptions): Promise<string | undefined> {
    const policy = await this.getPolicy(organizationId);
    const afterDate = after ? parseAndValidateDate(after, 'after') : undefined;

    if (policy.kind === 'unlimited') {
      return afterDate?.toISOString();
    }

    const earliestAllowedDate = new Date(Date.now() - policy.durationMs);

    if (!afterDate) {
      return earliestAllowedDate.toISOString();
    }

    if (isBeforeRetentionWindow(afterDate, earliestAllowedDate)) {
      throw retentionExceeded(RANGE_EXCEEDS_RETENTION, earliestAllowedDate);
    }

    return afterDate.toISOString();
  }

  /** For by-ID reads: a record that a list endpoint can no longer return is not readable by its ID either. */
  async assertWithinRetention({ organizationId, createdAt }: AssertWithinActivityRetentionOptions): Promise<void> {
    const policy = await this.getPolicy(organizationId);
    if (policy.kind === 'unlimited') {
      return;
    }

    const earliestAllowedDate = new Date(Date.now() - policy.durationMs);

    if (isBeforeRetentionWindow(createdAt, earliestAllowedDate)) {
      throw retentionExceeded(RECORD_EXCEEDS_RETENTION, earliestAllowedDate);
    }
  }

  private async getPolicy(organizationId: string): Promise<ActivityRetentionPolicy> {
    const organization = await this.organizationRepository.findById(organizationId);
    if (!organization) {
      throw new HttpException('Organization not found', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    return getActivityRetentionPolicy(organization);
  }
}
