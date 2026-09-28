import { Button, Heading, renderAsync, Section, Text } from '@react-email/components';
import React from 'react';
import { EmailLayout } from '../../templates/layout';
import { UsageLimitsAlertState, UsageLimitsCta } from './schemas';

const DASHBOARD_URL = 'https://dashboard.novu.co';
const BILLING_PATH = '/settings/billing';
const USAGE_LIMITS_PATH = '/settings/billing?usageLimits=open';

export interface IUsageLimitsCopyInput {
  alertState?: UsageLimitsAlertState;
  cta?: UsageLimitsCta;
  percentage?: number;
  organizationName?: string;
  usage?: number;
  allowance?: number;
  includedEvents?: number | null;
  headroom?: number | null;
  planName?: string;
}

interface IUsageFigures {
  organizationName: string;
  planName: string;
  percentage: number;
  usage: number;
  allowance: number;
  includedEvents: number;
  hasSetLimit: boolean;
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
  headroom,
}: IUsageLimitsCopyInput): IUsageLimitsCopy {
  const figures: IUsageFigures = {
    organizationName,
    planName,
    percentage: Math.round(percentage),
    usage,
    allowance,
    includedEvents: includedEvents ?? 0,
    hasSetLimit: typeof headroom === 'number',
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
  const summarize = (allowanceLabel: string) =>
    `Your organization ${figures.organizationName} has used ${formatCount(figures.usage)} events this billing period, ${figures.percentage}% of the ${formatCount(figures.allowance)} events ${allowanceLabel} on the ${figures.planName} plan.`;

  switch (alertState) {
    case 'approaching_limit':
      return {
        heading,
        summary: summarize('monthly limit'),
        message:
          'To ensure uninterrupted service and access to additional features, we recommend upgrading your plan before reaching the limit.',
        note: 'Note: Once you consume 100% of your monthly limit, notifications will be blocked until you upgrade or the next billing cycle begins.',
        buttonLabel: 'Upgrade your plan',
        dashboardPath: BILLING_PATH,
      };
    case 'blocked':
      return {
        heading,
        summary: summarize('monthly limit'),
        message: 'New notifications are blocked until you upgrade your plan or the next billing cycle begins.',
        buttonLabel: 'Upgrade your plan',
        dashboardPath: BILLING_PATH,
      };
    case 'alert_level_reached':
      return {
        heading,
        summary: summarize('monthly usage alert level'),
        message:
          'Your notifications will keep sending. If this volume is unexpected, review your workflows and triggers, or reach out to us to discuss a plan that fits your usage.',
        buttonLabel: 'Review your usage',
        dashboardPath: BILLING_PATH,
      };
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

function getEditLimitsCopy(alertState: UsageLimitsAlertState, figures: IUsageFigures): IUsageLimitsCopy {
  const { organizationName, planName, usage, allowance, includedEvents } = figures;
  const onDemand = Math.max(usage - includedEvents, 0);
  const usageBreakdown = `Your organization ${organizationName} has used ${formatCount(usage)} workflow runs this billing period: all ${formatCount(includedEvents)} runs included in the ${planName} plan and ${formatCount(onDemand)} on-demand.`;
  const limitLabel = figures.hasSetLimit ? 'usage limit' : 'monthly usage alert level';
  const limitSummary = `${usageBreakdown} Your ${limitLabel} is ${formatCount(allowance)} workflow runs.`;
  const usageAgainstLimit = `You have used ${formatCount(usage)} workflow runs against your ${formatCount(allowance)} ${limitLabel}.`;

  switch (alertState) {
    case 'included_exhausted':
      return {
        heading: 'Used All Included Workflow Runs',
        summary: usageBreakdown,
        message:
          'Further workflow runs this billing period are billed on-demand. Review your usage limits to control how many on-demand runs you allow and whether sending pauses at the limit.',
        buttonLabel: 'Review usage limits',
        dashboardPath: USAGE_LIMITS_PATH,
        notificationText: {
          subject: 'You have used all included workflow runs',
          body: `You have used all ${formatCount(includedEvents)} workflow runs included in your plan. Further runs this billing period are billed on-demand.`,
        },
      };
    case 'approaching_limit':
      return {
        heading: 'Approaching Your Usage Limit',
        summary: limitSummary,
        message:
          'Once usage reaches your limit, new workflow runs are paused until you raise the limit, turn off pause at limit, or the next billing cycle begins.',
        buttonLabel: 'Edit usage limits',
        dashboardPath: USAGE_LIMITS_PATH,
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
        dashboardPath: USAGE_LIMITS_PATH,
        notificationText: {
          subject: 'Usage limit reached: new workflow runs are paused',
          body: `New workflow runs are paused at your ${formatCount(allowance)} usage limit. Raise the limit or turn off pause at limit to resume sending.`,
        },
      };
    case 'alert_level_reached':
      return {
        heading: 'Usage Alert for Your Workflow Runs',
        summary: limitSummary,
        message:
          'Your notifications keep sending, and further workflow runs are billed on-demand. If this volume is unexpected, review your workflows and triggers, or edit your usage limits to pause sending at a set limit.',
        buttonLabel: 'Review usage limits',
        dashboardPath: USAGE_LIMITS_PATH,
        notificationText: {
          subject: `Usage alert: ${figures.percentage}% of the way to your ${limitLabel}`,
          body: `${usageAgainstLimit} Sending continues, with further runs billed on-demand.`,
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
