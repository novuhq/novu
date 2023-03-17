import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Center } from '@mantine/core';
import styled from '@emotion/styled';
import { ReactFlowProvider } from 'react-flow-renderer';

import { useSegment } from '../../../components/providers/SegmentProvider';
import { GetStartedLayout } from '../components/layout/GetStartedLayout';
import { DigestDemoFlow } from '../../../components';
import useStyles from '../components/OnboardingSteps.styles';
import { localNavigate } from '../components/route/store';
import { ArrowLeft } from '../../../design-system/icons';
import { Button } from '../../../design-system';
import { ArrowLeftGradient } from '../../../design-system/icons/gradient/ArrowLeftGradient';
import { Label } from '../../../design-system/typography/label';
import { getStartedSteps } from '../consts';
import { ROUTES } from '../../../constants/routes.enum';
import { HeaderSecondaryTitle, HeaderTitle } from '../components/layout/HeaderLayout';
import { useCreateDigestDemoWorkflow } from '../../../api/hooks/notification-templates/useCreateDigestDemoWorkflow';

export function DigestPreview() {
  const segment = useSegment();
  const { theme } = useStyles();
  const gradientColor = theme.colorScheme === 'dark' ? 'none' : 'red';

  useEffect(() => {
    // segment.track(OnBoardingAnalyticsEnum.QUICK_START_VISIT);
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
        leftSide: (
          <NavButton navigateTo={getStartedSteps.first}>
            <ThemeArrowLeft style={{ marginRight: '10px' }} />
            <Label gradientColor={gradientColor}>Previous</Label>
          </NavButton>
        ),
        rightSide: <RightSide />,
      }}
    >
      <DemoContainer>
        <ReactFlowProvider>
          <DigestDemoFlowStyled />
        </ReactFlowProvider>
      </DemoContainer>
    </GetStartedLayout>
  );
}

function RightSide() {
  const { createDigestDemoWorkflow, isLoading: isCreating } = useCreateDigestDemoWorkflow();

  return (
    <ButtonsHolder>
      <NavButton navigateTo={ROUTES.TEMPLATES_CREATE}>
        <ButtonText>Build a Workflow</ButtonText>
      </NavButton>
      <StyledButton fullWidth pulse onClick={createDigestDemoWorkflow} loading={isCreating}>
        <ButtonText>Try the Digest Playground</ButtonText>
      </StyledButton>
    </ButtonsHolder>
  );
}

const DigestDemoFlowStyled = styled(DigestDemoFlow)`
  height: 400px;
`;

const ButtonsHolder = styled.div`
  display: flex;
  gap: 40px;
`;

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

export function NavButton({
  pulse = false,
  navigateTo,
  variant,
  children,
  ...props
}: {
  pulse?: boolean;
  navigateTo: string;
  variant?: 'outline' | 'gradient';
  children: React.ReactNode;
} & React.HTMLAttributes<HTMLDivElement>) {
  const navigate = useNavigate();

  function handleOnClick() {
    localNavigate().push(navigateTo);

    if (navigateTo) {
      navigate(navigateTo);
    }
  }

  return (
    <Center data-test-id="get-started-footer-left-side" inline onClick={handleOnClick} {...props}>
      <StyledButton fullWidth variant={variant ?? 'outline'} pulse={pulse}>
        <>{children}</>
      </StyledButton>
    </Center>
  );
}

function ThemeArrowLeft(props: React.ComponentPropsWithoutRef<'svg'>) {
  const { theme } = useStyles();

  return <>{theme.colorScheme === 'dark' ? <ArrowLeft {...props} /> : <ArrowLeftGradient {...props} />}</>;
}

const StyledButton = styled(Button)`
  height: 50px;
`;
