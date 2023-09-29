import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { useSegment } from '../../../components/providers/SegmentProvider';
import { ROUTES } from '../../../constants/routes.enum';
import { QuickStartWrapper } from '../components/QuickStartWrapper';
import { SetupTimeline } from '../components/SetupTimeline';
import { demoSetupSecondaryTitle, OnBoardingAnalyticsEnum } from '../consts';

export function Setup() {
  const navigate = useNavigate();
  const segment = useSegment();
  const { framework } = useParams();

  const goBackRoute = framework === 'demo' ? ROUTES.QUICK_START_NOTIFICATION_CENTER : ROUTES.QUICK_START_SETUP;
  const secondaryTitle = framework === 'demo' ? demoSetupSecondaryTitle : '';

  useEffect(() => {
    segment.track(OnBoardingAnalyticsEnum.FRAMEWORK_SETUP_VISIT, { framework });
  }, [segment, framework]);

  function handleOnCopy(copiedStepIndex: number) {
    const stepNumber = (copiedStepIndex + 1).toString();
    segment.track(OnBoardingAnalyticsEnum.COPIED_STEP, { step: stepNumber });
  }

  return (
    <QuickStartWrapper faq={true} secondaryTitle={secondaryTitle} goBackPath={goBackRoute}>
      <SetupTimeline
        framework={framework || 'react'}
        onDone={() => {
          navigate(`/quickstart/notification-center/set-up/${framework}/success`);
        }}
        onCopy={handleOnCopy}
        onConfigureLater={() => {
          navigate(ROUTES.WORKFLOWS);
          segment.track(OnBoardingAnalyticsEnum.CONFIGURE_LATER_CLICK, { screen: 'framework instructions', framework });
        }}
      />
    </QuickStartWrapper>
  );
}
