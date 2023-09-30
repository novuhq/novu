import { useEffect } from 'react';
import { useSegment } from '../../../components/providers/SegmentProvider';
import { InAppSandbox, SandboxFooter } from '../../../components/quick-start/in-app-onboarding';
import { ROUTES } from '../../../constants/routes.enum';
import { QuickStartWrapper } from '../components/QuickStartWrapper';
import { FlowTypeEnum, OnBoardingAnalyticsEnum } from '../consts';

export function NotificationCenter() {
  const segment = useSegment();

  useEffect(() => {
    segment.track(OnBoardingAnalyticsEnum.FLOW_SELECTED, { flow: FlowTypeEnum.IN_APP });
  }, [segment]);

  return (
    <QuickStartWrapper
      title="In-App Notification Center Sandbox"
      secondaryTitle="Play around with the In-App sandbox. Click to trigger a notification."
      goBackPath={ROUTES.GET_STARTED}
      footer={<SandboxFooter />}
    >
      <InAppSandbox />
    </QuickStartWrapper>
  );
}
