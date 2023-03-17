import React, { useEffect } from 'react';
import styled from '@emotion/styled';
import { ReactFlowProvider } from 'react-flow-renderer';

import { GetStartedLayout } from '../components/layout/GetStartedLayout';
import { DigestDemoFlow } from '../../../components';
import useStyles from '../components/OnboardingSteps.styles';
import { ArrowLeft } from '../../../design-system/icons';
import { ArrowLeftGradient } from '../../../design-system/icons/gradient/ArrowLeftGradient';
import { getStartedSteps, OnBoardingAnalyticsEnum } from '../consts';
import { Label } from '../../../design-system/typography/label';
import { ROUTES } from '../../../constants/routes.enum';
import { HeaderSecondaryTitle, HeaderTitle } from '../components/layout/HeaderLayout';
import { NavButton } from '../components/NavButton';
import { useSegment } from '../../../components/providers/SegmentProvider';

export function DigestPreview() {
  const segment = useSegment();

  useEffect(() => {
    segment.track(OnBoardingAnalyticsEnum.BUILD_NOTIFICATION_WORKFLOW_VISIT);
  }, []);

  return (
    <GetStartedLayout
      header={
        <>
          <HeaderTitle>Set-up steps to get started</HeaderTitle>
          <HeaderSecondaryTitle>Quick Start Guide</HeaderSecondaryTitle>
        </>
      }
      footer={{
        leftSide: <FooterLeftSide />,
        rightSide: <FooterRightSide />,
      }}
    >
      <DemoContainer>
        <ReactFlowProvider>
          <DigestDemoFlow />
        </ReactFlowProvider>
      </DemoContainer>
    </GetStartedLayout>
  );
}
function FooterLeftSide() {
  const { theme } = useStyles();
  const segment = useSegment();
  const gradientColor = theme.colorScheme === 'dark' ? 'none' : 'red';

  function handleOnClick() {
    segment.track(OnBoardingAnalyticsEnum.BUILD_WORKFLOW_NAVIGATION_CLICK_PREVIOUS_PAGE);
  }

  return (
    <NavButton navigateTo={getStartedSteps.first} handleOnClick={handleOnClick}>
      <ThemeArrowLeft style={{ marginRight: '10px' }} />
      <Label gradientColor={gradientColor}>Previous Page</Label>
    </NavButton>
  );
}

function FooterRightSide() {
  const segment = useSegment();

  function handlerBuildWorkflowClick() {
    segment.track(OnBoardingAnalyticsEnum.BUILD_WORKFLOW_NAVIGATION_CLICK_BUILD_WORKFLOW);
  }

  function handlerTryDigestClick() {
    segment.track(OnBoardingAnalyticsEnum.BUILD_WORKFLOW_NAVIGATION_CLICK_TRY_DIGEST);
  }

  return (
    <>
      <NavButton
        navigateTo={ROUTES.TEMPLATES}
        handleOnClick={handlerBuildWorkflowClick}
        style={{ marginRight: '40px' }}
      >
        <ButtonText>Build a Workflow</ButtonText>
      </NavButton>
      <NavButton pulse={true} navigateTo={ROUTES.TEMPLATES} handleOnClick={handlerTryDigestClick} variant={'gradient'}>
        <ButtonText>Try the Digest Playground</ButtonText>
      </NavButton>
    </>
  );
}

const DemoContainer = styled.div`
  width: 400px;

  @media screen and (min-width: 1367px) {
    width: 450px;
  }

  @media screen and (min-width: 1921px) {
    width: 600px;
  }
`;

const ButtonText = styled.div`
  font-size: 16px;
`;

function ThemeArrowLeft(props: React.ComponentPropsWithoutRef<'svg'>) {
  const { theme } = useStyles();

  return <>{theme.colorScheme === 'dark' ? <ArrowLeft {...props} /> : <ArrowLeftGradient {...props} />}</>;
}
