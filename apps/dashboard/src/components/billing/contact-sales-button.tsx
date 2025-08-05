import { getCalApi } from '@calcom/embed-react';
import { ApiServiceLevelEnum } from '@novu/shared';
import { useEffect } from 'react';
import { Button } from '@/components/primitives/button';
import { useTelemetry } from '../../hooks/use-telemetry';
import { TelemetryEvent } from '../../utils/telemetry';

interface ContactSalesButtonProps {
  className?: string;
}

export function ContactSalesButton({ className }: ContactSalesButtonProps) {
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
      source: 'billing_page',
    });
  };

  return (
    <Button
      mode="lighter"
      variant="secondary"
      size="xs"
      className={className}
      data-cal-namespace="novu-meeting"
      data-cal-link="team/novu/novu-meeting"
      data-cal-config='{"layout":"month_view"}'
      onClick={handleContactSales}
    >
      Contact sales
    </Button>
  );
}
