import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CommunityOrganizationRepository, OrganizationEntity } from '@novu/dal';
import { ApiServiceLevelEnum, FeatureNameEnum, getFeatureForTierAsNumber } from '@novu/shared';

export interface ValidatedRetentionWindow {
  after: string;
  before: string;
}

@Injectable()
export class ActivityRetentionService {
  constructor(private organizationRepository: CommunityOrganizationRepository) {}

  async validateRetentionLimitForTier(
    organizationId: string,
    createdAtGte?: string,
    createdAtLte?: string
  ): Promise<ValidatedRetentionWindow> {
    const organization = await this.organizationRepository.findById(organizationId);

    if (!organization) {
      throw new HttpException('Organization not found', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    const maxRetentionMs = this.getMaxRetentionPeriodByOrganization(organization);
    const earliestAllowedDate = new Date(Date.now() - maxRetentionMs);
    const effectiveStartDate = createdAtGte ? new Date(createdAtGte) : earliestAllowedDate;
    const effectiveEndDate = createdAtLte ? new Date(createdAtLte) : new Date();

    this.validateDateRange(earliestAllowedDate, effectiveStartDate, effectiveEndDate);

    return {
      after: effectiveStartDate.toISOString(),
      before: effectiveEndDate.toISOString(),
    };
  }

  queryWindowForWorkflowRuns(window: ValidatedRetentionWindow, createdAtLte?: string): ValidatedRetentionWindow {
    if (createdAtLte) {
      return window;
    }

    // One-hour buffer so in-flight ClickHouse writes are not excluded by clock skew
    return {
      after: window.after,
      before: new Date(new Date(window.before).getTime() + 60 * 60 * 1000).toISOString(),
    };
  }

  private validateDateRange(earliestAllowedDate: Date, startDate: Date, endDate: Date) {
    if (startDate > endDate) {
      throw new HttpException(
        'Invalid date range: start date (createdAtGte) must be earlier than end date (createdAtLte)',
        HttpStatus.BAD_REQUEST
      );
    }

    const buffer = 1 * 60 * 60 * 1000;
    const bufferedEarliestAllowedDate = new Date(earliestAllowedDate.getTime() - buffer);

    if (
      process.env.NODE_ENV !== 'local' &&
      (startDate < bufferedEarliestAllowedDate || endDate < bufferedEarliestAllowedDate)
    ) {
      throw new HttpException(
        `Requested date range exceeds your plan's retention period. ` +
          `The earliest accessible date for your plan is ${earliestAllowedDate.toISOString().split('T')[0]}. ` +
          `Please upgrade your plan to access older activities.`,
        HttpStatus.PAYMENT_REQUIRED
      );
    }
  }

  /**
   * Charts and activity data follow the same retention policy as activity feed notifications.
   * Data is automatically deleted after a certain period of time based on the organization's tier.
   */
  private getMaxRetentionPeriodByOrganization(organization: OrganizationEntity) {
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
}
