import { UsageAlertRecipientsEnum } from '../../entities/organization/organization.interface';

export type UsageLimitsSettingsDto = {
  workflowRuns: {
    /**
     * On-demand workflow runs allowed on top of the included runs, or null for no limit.
     */
    onDemandLimit: number | null;
    /**
     * Rejects new workflow runs once usage reaches the included runs plus the on-demand limit. Requires an on-demand limit.
     */
    pauseAtLimit: boolean;
  };
  alerts: {
    enabled: boolean;
    sendTo: UsageAlertRecipientsEnum;
  };
};

/**
 * Request body of `PUT /billing/usage-limits`. Replaces every setting.
 */
export type UpdateUsageLimitsDto = UsageLimitsSettingsDto;
