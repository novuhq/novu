import { Button, Heading, renderAsync, Section, Text } from '@react-email/components';
import React from 'react';
import { EmailLayout } from '../../templates/layout';

interface IEmailProps {
  percentage?: number;
  organizationName?: string;
  previewText?: string;
}

export function UsageLimitsEmail({ percentage, organizationName, previewText }: IEmailProps) {
  const roundedPercentage = Math.round(percentage || 0);

  return (
    <EmailLayout previewText={previewText}>
      <Heading className="mx-0 my-[30px] p-0 text-center text-[24px] font-normal text-black">
        Used {roundedPercentage}% of Your Monthly Events
      </Heading>
      <Text className="text-[14px] leading-[24px] text-black">
        Your organization {organizationName} has used {roundedPercentage}% of the free tier monthly limit of 30,000
        events.
      </Text>

      <Text className="text-[14px] leading-[24px] text-black">
        To ensure uninterrupted service and access to additional features, we recommend upgrading your plan before
        reaching the limit.
      </Text>

      <Section className="mb-[32px] mt-[32px] text-center">
        <Button
          className="rounded bg-[#000000] px-5 py-3 text-center text-[12px] font-semibold text-white no-underline"
          href={'https://dashboard.novu.co/settings/billing'}
        >
          Upgrade Your Plan
        </Button>
      </Section>

      <Text className="text-[12px] leading-[20px] text-gray-500">
        Note: Once you consume 100% of your monthly limit, notifications will be blocked until you upgrade or the next
        billing cycle begins. begins.
      </Text>
    </EmailLayout>
  );
}

export interface IRenderEmailPayload {
  percentage?: number;
  organizationName?: string;
}

export interface IEmailControls {
  previewText?: string;
}

export async function renderUsageLimitsEmail(payload: IRenderEmailPayload, controls: IEmailControls) {
  return renderAsync(<UsageLimitsEmail {...payload} {...controls} />);
}
