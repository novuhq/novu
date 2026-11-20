import { getCalApi } from '@calcom/embed-react';
import { ApiServiceLevelEnum } from '@novu/shared';
import { useEffect } from 'react';
import { Button, type ButtonProps } from '@/components/primitives/button';
import { useTelemetry } from '../../hooks/use-telemetry';
import { TelemetryEvent } from '../../utils/telemetry';

type ContactSalesButtonProps = Pick<
  ButtonProps,
  'className' | 'variant' | 'mode' | 'size' | 'trailingIcon' | 'children'
> & {
  utmCampaign?: string;
};

export function ContactSalesButton({
  className,
  utmCampaign = 'billing_page',
  variant = 'secondary',
  mode = 'lighter',
  size = 'xs',
  trailingIcon,
  children = 'Contact sales',
}: ContactSalesButtonProps) {
  const track = useTelemetry();

  useEffect(() => {
    (async () => {
      const cal = await getCalApi({ namespace: 'novu-meeting' });
      cal('ui', { hideEventTypeDetails: false, layout: 'month_view' });
    })();
  }, []);

  const handleContactSales = () => {
    track(TelemetryEvent.BILLING_CONTACT_SALES_CLICKED, {
      intendedPlan: ApiServiceLevelEnum.ENTERPRISE,
      source: utmCampaign,
    });
  };

  return (
    <Button
      type="button"
      mode={mode}
      variant={variant}
      size={size}
      trailingIcon={trailingIcon}
      className={className}
      data-cal-namespace="novu-meeting"
      data-cal-link="team/novu/novu-meeting"
      data-cal-config={JSON.stringify({
        layout: 'month_view',
        utm_source: 'dashboard',
        utm_medium: 'billing',
        utm_campaign: utmCampaign,
      })}
      onClick={handleContactSales}
    >
      {children}
    </Button>
  );
}
