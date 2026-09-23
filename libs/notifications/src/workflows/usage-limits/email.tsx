import { Button, Heading, renderAsync, Section, Text } from '@react-email/components';
import React from 'react';
import { EmailLayout } from '../../templates/layout';
import { UsageLimitsAlertState } from './schemas';

interface IEmailProps {
  alertState?: UsageLimitsAlertState;
  percentage?: number;
  organizationName?: string;
  usage?: number;
  allowance?: number;
  planName?: string;
  previewText?: string;
}

interface IUsageLimitsCopy {
  allowanceLabel: string;
  message: string;
  buttonLabel: string;
  note?: string;
}

const formatCount = (value: number) => value.toLocaleString('en-US');

function getUsageLimitsCopy(alertState: UsageLimitsAlertState): IUsageLimitsCopy {
  switch (alertState) {
    case 'approaching_limit':
      return {
        allowanceLabel: 'monthly limit',
        message:
          'To ensure uninterrupted service and access to additional features, we recommend upgrading your plan before reaching the limit.',
        buttonLabel: 'Upgrade Your Plan',
        note: 'Note: Once you consume 100% of your monthly limit, notifications will be blocked until you upgrade or the next billing cycle begins.',
      };
    case 'blocked':
      return {
        allowanceLabel: 'monthly limit',
        message: 'New notifications are blocked until you upgrade your plan or the next billing cycle begins.',
        buttonLabel: 'Upgrade Your Plan',
      };
    case 'alert_level_reached':
      return {
        allowanceLabel: 'monthly usage alert level',
        message:
          'Your notifications will keep sending. If this volume is unexpected, review your workflows and triggers, or reach out to us to discuss a plan that fits your usage.',
        buttonLabel: 'Review Your Usage',
      };
    default: {
      const unhandled: never = alertState;

      throw new Error(`Unhandled usage limits alert state: ${unhandled}`);
    }
  }
}

export function UsageLimitsEmail({
  alertState,
  percentage,
  organizationName,
  usage,
  allowance,
  planName,
  previewText,
}: IEmailProps) {
  const roundedPercentage = Math.round(percentage || 0);
  const copy = getUsageLimitsCopy(alertState);

  return (
    <EmailLayout previewText={previewText}>
      <Heading className="mx-0 my-[30px] p-0 text-center text-[24px] font-normal text-black">
        Used {roundedPercentage}% of Your Monthly Events
      </Heading>
      <Text className="text-[14px] leading-[24px] text-black">
        Your organization {organizationName} has used {formatCount(usage || 0)} events this billing period,{' '}
        {roundedPercentage}% of the {formatCount(allowance || 0)} events {copy.allowanceLabel} on the {planName} plan.
      </Text>

      <Text className="text-[14px] leading-[24px] text-black">{copy.message}</Text>

      <Section className="mb-[32px] mt-[32px] text-center">
        <Button
          className="rounded bg-[#000000] px-5 py-3 text-center text-[12px] font-semibold text-white no-underline"
          href={'https://dashboard.novu.co/settings/billing'}
        >
          {copy.buttonLabel}
        </Button>
      </Section>

      {copy.note && <Text className="text-[12px] leading-[20px] text-gray-500">{copy.note}</Text>}
    </EmailLayout>
  );
}

export interface IRenderEmailPayload {
  alertState?: UsageLimitsAlertState;
  percentage?: number;
  organizationName?: string;
  usage?: number;
  allowance?: number;
  planName?: string;
}

export interface IEmailControls {
  previewText?: string;
}

export async function renderUsageLimitsEmail(payload: IRenderEmailPayload, controls: IEmailControls) {
  return renderAsync(<UsageLimitsEmail {...payload} {...controls} />);
}
