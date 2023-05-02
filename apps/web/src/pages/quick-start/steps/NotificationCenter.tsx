import styled from '@emotion/styled';
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
  }, []);

  return (
    <QuickStartWrapper
      title="In-App Notification Center Sandbox"
      secondaryTitle="Play around with the In-App sandbox. Click to trigger a notification."
      goBackPath={ROUTES.GET_STARTED}
    >
      <ChildrenWrapper>
        <InAppSandbox />
        <SandboxFooter />
      </ChildrenWrapper>
    </QuickStartWrapper>
  );
}

const ChildrenWrapper = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  flex: 1;
  height: 100%;
  width: 100%;
  position: absolute;
  top: 0;
  left: 0;
`;
