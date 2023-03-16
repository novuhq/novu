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

export function DigestPreview() {
  const segment = useSegment();
  const { theme } = useStyles();
  const gradientColor = theme.colorScheme === 'dark' ? 'none' : 'red';

  useEffect(() => {
    // segment.track(OnBoardingAnalyticsEnum.QUICK_START_VISIT);
  }, []);

  return (
    <GetStartedLayout
      footer={{
        leftSide: (
          <NavButton navigateTo={getStartedSteps.first}>
            <ThemeArrowLeft style={{ marginRight: '10px' }} />
            <Label gradientColor={gradientColor}>Previous Page</Label>
          </NavButton>
        ),
        rightSide: <RightSide />,
      }}
    >
      <ReactFlowProvider>
        <DigestDemoFlow />
      </ReactFlowProvider>
    </GetStartedLayout>
  );
}

function RightSide() {
  return (
    <>
      <NavButton navigateTo={ROUTES.TEMPLATES} style={{ marginRight: '40px' }}>
        <ButtonText>Build a Workflow</ButtonText>
      </NavButton>
      <NavButton navigateTo={ROUTES.TEMPLATES} variant={'gradient'}>
        <ButtonText>Try the Digest Playground</ButtonText>
      </NavButton>
    </>
  );
}

const ButtonText = styled.div`
  font-size: 16px;
`;

export function NavButton({
  navigateTo,
  variant,
  children,
  ...props
}: {
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
      <StyledButton fullWidth variant={variant ?? 'outline'}>
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
