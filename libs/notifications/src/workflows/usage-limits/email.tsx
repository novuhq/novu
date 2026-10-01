import { USAGE_LIMITS_DASHBOARD_PATH } from '@novu/shared';
import { Button, Heading, renderAsync, Section, Text } from '@react-email/components';
import React from 'react';
import { EmailLayout } from '../../templates/layout';
import { UsageLimitsAlertState, UsageLimitsCta } from './schemas';

const DASHBOARD_URL = 'https://dashboard.novu.co';
const BILLING_PATH = '/settings/billing';

export interface IUsageLimitsCopyInput {
  alertState?: UsageLimitsAlertState;
  cta?: UsageLimitsCta;
  percentage?: number;
  organizationName?: string;
  usage?: number;
  allowance?: number;
  includedEvents?: number | null;
  planName?: string;
}

interface IUsageFigures {
  organizationName: string;
  planName: string;
  percentage: number;
  usage: number;
  allowance: number;
  includedEvents: number;
  /** The plan bills on-demand usage past `includedEvents`. */
  billsOnDemand: boolean;
}

interface IUsageLimitsNotificationText {
  subject: string;
  body: string;
}

export interface IUsageLimitsCopy {
  heading: string;
  summary: string;
  message: string;
  note?: string;
  buttonLabel: string;
  /** Relative to the dashboard host. */
  dashboardPath: string;
  /** The email subject and preview, and the in-app subject and body; absent where the step controls hold them. */
  notificationText?: IUsageLimitsNotificationText;
}

const formatCount = (value: number) => value.toLocaleString('en-US');

// The framework passes a partial payload (e.g. step previews), so every field needs a fallback.
export function getUsageLimitsCopy({
  alertState = 'approaching_limit',
  cta = 'upgrade',
  organizationName = '',
  planName = '',
  percentage = 0,
  usage = 0,
  allowance = 0,
  includedEvents,
}: IUsageLimitsCopyInput): IUsageLimitsCopy {
  const figures: IUsageFigures = {
    organizationName,
    planName,
    percentage: Math.round(percentage),
    usage,
    allowance,
    includedEvents: includedEvents ?? 0,
    billsOnDemand: typeof includedEvents === 'number',
  };

  switch (cta) {
    case 'upgrade':
      return getUpgradeCopy(alertState, figures);
    case 'edit_limits':
      return getEditLimitsCopy(alertState, figures);
    default: {
      const unhandled: never = cta;

      throw new Error(`Unhandled usage limits CTA: ${unhandled}`);
    }
  }
}

function getUpgradeCopy(alertState: UsageLimitsAlertState, figures: IUsageFigures): IUsageLimitsCopy {
  const heading = `Used ${figures.percentage}% of Your Monthly Events`;
  const summary = `Your organization ${figures.organizationName} has used ${formatCount(figures.usage)} events this billing period, ${figures.percentage}% of the ${formatCount(figures.allowance)} events monthly limit on the ${figures.planName} plan.`;

  switch (alertState) {
    case 'approaching_limit':
      return {
        heading,
        summary,
        message:
          'To ensure uninterrupted service and access to additional features, we recommend upgrading your plan before reaching the limit.',
        note: 'Note: Once you consume 100% of your monthly limit, notifications will be blocked until you upgrade or the next billing cycle begins.',
        buttonLabel: 'Upgrade your plan',
        dashboardPath: BILLING_PATH,
      };
    case 'blocked':
      return {
        heading,
        summary,
        message: 'New notifications are blocked until you upgrade your plan or the next billing cycle begins.',
        buttonLabel: 'Upgrade your plan',
        dashboardPath: BILLING_PATH,
      };
    case 'alert_level_reached':
      return getUsageUpdateCopy(figures);
    case 'included_exhausted':
      // Only plans that bill on-demand past their included events reach this state, so only the CTA differs.
      return {
        ...getEditLimitsCopy(alertState, figures),
        buttonLabel: 'Review your usage',
        dashboardPath: BILLING_PATH,
      };
    default: {
      const unhandled: never = alertState;

      throw new Error(`Unhandled usage limits alert state: ${unhandled}`);
    }
  }
}

/** The alert level of a plan without a set limit is internal, so the copy states the usage rather than a percentage. */
function getUsageUpdateCopy({
  organizationName,
  planName,
  usage,
  includedEvents,
  billsOnDemand,
}: IUsageFigures): IUsageLimitsCopy {
  const includedNote = billsOnDemand
    ? ` Your ${planName} plan includes ${formatCount(includedEvents)}, and runs beyond that are billed on-demand.`
    : '';

  return {
    heading: 'Your usage this billing period',
    summary: `Your organization ${organizationName} has used ${formatCount(usage)} workflow runs so far this billing period.${includedNote}`,
    message:
      'Nothing changes on your side: your notifications keep sending. We’re letting you know because this is higher than typical for your plan. If it’s expected, no action is needed. If not, it may be worth a look at your workflows and triggers.',
    buttonLabel: 'View usage',
    dashboardPath: BILLING_PATH,
    notificationText: {
      subject: 'A quick update on your workflow runs',
      body: `${organizationName} has used ${formatCount(usage)} workflow runs this billing period. Your notifications keep sending as usual.`,
    },
  };
}

function getEditLimitsCopy(alertState: UsageLimitsAlertState, figures: IUsageFigures): IUsageLimitsCopy {
  const { organizationName, planName, percentage, usage, allowance, includedEvents } = figures;
  const onDemand = Math.max(usage - includedEvents, 0);
  const limitSummary = `Your organization ${organizationName} has used ${formatCount(usage)} workflow runs this billing period: the ${formatCount(includedEvents)} included in the ${planName} plan and ${formatCount(onDemand)} on-demand. Your usage limit is ${formatCount(allowance)} workflow runs.`;
  const usageAgainstLimit = `You have used ${formatCount(usage)} workflow runs against your ${formatCount(allowance)} usage limit.`;
  const keepsSendingOnDemand = 'Your notifications keep sending, and additional runs are billed on-demand.';

  switch (alertState) {
    case 'included_exhausted':
      return {
        heading: 'You’ve used your included workflow runs',
        summary: `Your organization ${organizationName} has used all ${formatCount(includedEvents)} workflow runs included in the ${planName} plan this billing period.`,
        message: `Nothing changes on your side: your notifications keep sending, and additional runs are billed on-demand. We’ll check in again as you get closer to your ${formatCount(allowance)} usage limit.`,
        buttonLabel: 'Review usage limits',
        dashboardPath: USAGE_LIMITS_DASHBOARD_PATH,
        notificationText: {
          subject: 'You’ve used your included workflow runs',
          body: `You’ve used all ${formatCount(includedEvents)} workflow runs included in your ${planName} plan. ${keepsSendingOnDemand}`,
        },
      };
    case 'approaching_limit':
      return {
        heading: 'Approaching Your Usage Limit',
        summary: limitSummary,
        message:
          'Once usage reaches your limit, new workflow runs are paused until you raise the limit, turn off pause at limit, or the next billing cycle begins.',
        buttonLabel: 'Edit usage limits',
        dashboardPath: USAGE_LIMITS_DASHBOARD_PATH,
        notificationText: {
          subject: 'Approaching your usage limit: new workflow runs will pause',
          body: `${usageAgainstLimit} New workflow runs pause when you reach it.`,
        },
      };
    case 'blocked':
      return {
        heading: 'New Workflow Runs Are Paused',
        summary: limitSummary,
        message:
          'New workflow runs are paused. To resume sending, raise your usage limit or turn off pause at limit. Otherwise, sending resumes when the next billing cycle begins.',
        buttonLabel: 'Edit usage limits',
        dashboardPath: USAGE_LIMITS_DASHBOARD_PATH,
        notificationText: {
          subject: 'Usage limit reached: new workflow runs are paused',
          body: `New workflow runs are paused at your ${formatCount(allowance)} usage limit. Raise the limit or turn off pause at limit to resume sending.`,
        },
      };
    case 'alert_level_reached':
      if (percentage >= 100) {
        return {
          heading: 'You’ve reached your usage limit',
          summary: limitSummary,
          message:
            'Nothing is paused: your notifications keep sending, and additional runs are billed on-demand. If you’d like more room, or want sending to pause at your limit, you can update your usage limits.',
          buttonLabel: 'Review usage limits',
          dashboardPath: USAGE_LIMITS_DASHBOARD_PATH,
          notificationText: {
            subject: 'You’ve reached your usage limit',
            body: `${organizationName} has reached its ${formatCount(allowance)} workflow run usage limit. ${keepsSendingOnDemand}`,
          },
        };
      }

      return {
        heading: `You’re ${percentage}% of the way to your usage limit`,
        summary: limitSummary,
        message:
          'No action is needed. Your notifications keep sending, even past your limit, and additional runs are billed on-demand. If you’d like to change your limit, or pause sending when you reach it, you can do that in your usage limits.',
        buttonLabel: 'Review usage limits',
        dashboardPath: USAGE_LIMITS_DASHBOARD_PATH,
        notificationText: {
          subject: `You’re ${percentage}% of the way to your usage limit`,
          body: `${organizationName} has used ${formatCount(usage)} of its ${formatCount(allowance)} workflow run usage limit. Your notifications keep sending as usual.`,
        },
      };
    default: {
      const unhandled: never = alertState;

      throw new Error(`Unhandled usage limits alert state: ${unhandled}`);
    }
  }
}

interface IEmailProps {
  copy: IUsageLimitsCopy;
  previewText: string;
}

export function UsageLimitsEmail({ copy, previewText }: IEmailProps) {
  return (
    <EmailLayout previewText={previewText}>
      <Heading className="mx-0 my-[30px] p-0 text-center text-[24px] font-normal text-black">{copy.heading}</Heading>
      <Text className="text-[14px] leading-[24px] text-black">{copy.summary}</Text>

      <Text className="text-[14px] leading-[24px] text-black">{copy.message}</Text>

      <Section className="mb-[32px] mt-[32px] text-center">
        <Button
          className="rounded bg-[#000000] px-5 py-3 text-center text-[12px] font-semibold text-white no-underline"
          href={`${DASHBOARD_URL}${copy.dashboardPath}`}
        >
          {copy.buttonLabel}
        </Button>
      </Section>

      {copy.note && <Text className="text-[12px] leading-[20px] text-gray-500">{copy.note}</Text>}
    </EmailLayout>
  );
}

export async function renderUsageLimitsEmail(copy: IUsageLimitsCopy, previewText: string) {
  return renderAsync(<UsageLimitsEmail copy={copy} previewText={previewText} />);
}
