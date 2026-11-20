import type { Metadata } from 'next';

import { requireHumanAccount } from '@/lib/human-account';

import { CardHeading, SettingsCard } from '../settings-card';
import { PlanHeading, SettingsHeader } from '../settings-header';

export const metadata: Metadata = {
  title: 'Billing',
};

/** The plan and what paying will look like. Nothing is charged during early access (pricing: NV-8918). */
export default async function BillingPage() {
  await requireHumanAccount({ returnTo: '/settings/billing' });

  return (
    <>
      <SettingsHeader tab="billing" />
      {/* The design's `Dither` here is 434px wide at 20%. */}
      <SettingsCard className="dither-side flex [--dither-opacity:0.2] [--dither-width:434px]">
        <PlanHeading />
      </SettingsCard>
      <SettingsCard className="py-4">
        <CardHeading title="Payment method" description="None. Not needed yet." />
      </SettingsCard>
      <SettingsCard className="py-4">
        <CardHeading title="Invoices" description="No invoices yet." />
      </SettingsCard>
    </>
  );
}
