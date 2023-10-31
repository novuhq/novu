import styled from '@emotion/styled';
import { Group, Stack } from '@mantine/core';
import { useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import PageContainer from '../../../components/layout/components/PageContainer';
import { useSegment } from '../../../components/providers/SegmentProvider';
import { SandBoxSetupSuccess } from '../../../components/quick-start/in-app-onboarding/SandboxSetupSuccess';
import { ROUTES } from '../../../constants/routes.enum';
import { Button, colors } from '@novu/design-system';
import { currentOnboardingStep } from '../components/route/store';
import { FlowTypeEnum, OnBoardingAnalyticsEnum } from '../consts';

const successScreenTitle = '🎉 Success, your application is connected!';
const successScreenSecondaryTitle = 'Create a workflow to start sending notifications.';

export function InAppSuccess() {
  const segment = useSegment();
  const { framework } = useParams();
  const location = useLocation();

  useEffect(() => {
    segment.track(OnBoardingAnalyticsEnum.IN_APP_SANDBOX_SUCCESS_VISIT, { flow: FlowTypeEnum.IN_APP, framework });
    currentOnboardingStep().set(location.pathname);
  }, [segment, framework, location.pathname]);

  return (
    <PageContainer
      style={{
        minHeight: '90%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '42px 30px',
      }}
    >
      <Stack>
        <Stack spacing={8}>
          <Title>{successScreenTitle}</Title>
          <SecondaryTitle>{successScreenSecondaryTitle}</SecondaryTitle>
        </Stack>
        <Group position="center">
          <ActionItem />
        </Group>
      </Stack>
      <SetupWrapper>
        <SandBoxSetupSuccess />
      </SetupWrapper>
    </PageContainer>
  );
}

function ActionItem() {
  const navigate = useNavigate();

  return (
    <Button
      variant="gradient"
      onClick={() => {
        navigate(ROUTES.WORKFLOWS_CREATE);
      }}
    >
      Create a Workflow
    </Button>
  );
}

const Title = styled.div`
  font-size: 28px;
  font-weight: 800;
  line-height: 1.4;
  color: ${colors.B40};
  tex-align: center;
`;

const SecondaryTitle = styled.div`
  font-size: 16px;
  line-height: 1.25;
  text-align: center;
`;

const SetupWrapper = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  flex: 1;
`;
