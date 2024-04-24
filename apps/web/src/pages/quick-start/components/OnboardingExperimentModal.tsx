import { useEffect, useState } from 'react';
import { Modal, useMantineTheme, Grid } from '@mantine/core';

import styled from '@emotion/styled';
import { colors, shadows, Title, Button } from '@novu/design-system';
import { useAuthContext, useSegment } from '@novu/shared-web';
import { useCreateOnboardingExperimentWorkflow } from '../../../api/hooks/notification-templates/useCreateOnboardingExperimentWorkflow';
import { OnboardingExperimentV2ModalKey } from '../../../constants/experimentsConstants';
import { OnBoardingAnalyticsEnum } from '../consts';

export function OnboardingExperimentModal() {
  const [opened, setOpened] = useState(true);
  const theme = useMantineTheme();
  const segment = useSegment();
  const { currentOrganization } = useAuthContext();
  const {
    createOnboardingExperimentWorkflow,
    isLoading: IsCreateOnboardingExpWorkflowLoading,
    isDisabled: isIsCreateOnboardingExpWorkflowDisabled,
  } = useCreateOnboardingExperimentWorkflow();
  const handleOnClose = () => {
    setOpened(true);
  };

  useEffect(() => {
    segment.track('Welcome modal open - [Onboarding]', {
      experiment_id: '2024-w15-onb',
      _organization: currentOrganization?._id,
    });
  }, [currentOrganization?._id, segment]);

  return (
    <Modal
      opened={opened}
      overlayColor={theme.colorScheme === 'dark' ? colors.BGDark : colors.BGLight}
      overlayOpacity={0.7}
      styles={{
        modal: {
          backgroundColor: theme.colorScheme === 'dark' ? colors.B15 : colors.white,
          width: '700px',
        },
        body: {
          paddingTop: '5px',
          paddingInline: '8px',
        },
      }}
      title={<Title size={2}>What would you like to do first?</Title>}
      sx={{ backdropFilter: 'blur(10px)' }}
      shadow={theme.colorScheme === 'dark' ? shadows.dark : shadows.medium}
      radius="md"
      size="lg"
      onClose={handleOnClose}
      centered
      withCloseButton={false}
    >
      <Grid>
        <Grid.Col xs={12} md={6} mb={20}>
          <ChannelCard>
            <TitleRow>Send test notification</TitleRow>
            <Description>Learn how to set up a workflow and send your first email notification.</Description>
            <StyledButton
              loading={IsCreateOnboardingExpWorkflowLoading}
              disabled={isIsCreateOnboardingExpWorkflowDisabled}
              pulse={true}
              variant="gradient"
              onClick={async () => {
                segment.track(OnBoardingAnalyticsEnum.ONBOARDING_EXPERIMENT_TEST_NOTIFICATION, {
                  action: 'Modal - Send test notification',
                  experiment_id: '2024-w15-onb',
                  _organization: currentOrganization?._id,
                });
                localStorage.removeItem(OnboardingExperimentV2ModalKey);
                createOnboardingExperimentWorkflow();
              }}
            >
              Send test notification now
            </StyledButton>
          </ChannelCard>
        </Grid.Col>
        <Grid.Col xs={12} md={6} mb={20}>
          <ChannelCard>
            <TitleRow> Look around</TitleRow>
            <Description>Start exploring the Novu app on your own terms</Description>
            <StyledButton
              variant="outline"
              onClick={async () => {
                segment.track(OnBoardingAnalyticsEnum.ONBOARDING_EXPERIMENT_TEST_NOTIFICATION, {
                  action: 'Modal - Get started',
                  experiment_id: '2024-w15-onb',
                  _organization: currentOrganization?._id,
                });
                localStorage.removeItem(OnboardingExperimentV2ModalKey);
                setOpened(false);
              }}
            >
              Get started
            </StyledButton>
          </ChannelCard>
        </Grid.Col>
      </Grid>
    </Modal>
  );
}

const ChannelCard = styled.div`
  display: flex;
  justify-content: space-between;
  flex-direction: column;
  max-width: 230px;
`;

const TitleRow = styled.div`
  display: flex;
  align-items: center;
  font-size: 20px;
  line-height: 32px;
  margin-bottom: 8px;
`;

const Description = styled.div`
  flex: auto;
  font-size: 16px;
  line-height: 20px;
  margin-bottom: 20px;
  color: ${colors.B60};
  height: 60px;
`;

const StyledButton = styled(Button)`
  width: fit-content;
  outline: none;
`;
