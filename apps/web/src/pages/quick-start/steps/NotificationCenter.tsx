import { ChannelTypeEnum, ICredentialsDto, InAppProviderIdEnum } from '@novu/shared';
import { useMutation } from '@tanstack/react-query';
import { useEffect } from 'react';
import { createIntegration } from '../../../api/integration';

import { useSegment } from '../../../components/providers/SegmentProvider';
import { InAppSandbox, SandboxFooter } from '../../../components/quick-start/in-app-onboarding';
import { ROUTES } from '../../../constants/routes.enum';
import { useIntegrations } from '../../../hooks';
import { QuickStartWrapper } from '../components/QuickStartWrapper';
import { FlowTypeEnum, OnBoardingAnalyticsEnum } from '../consts';

export function NotificationCenter() {
  const segment = useSegment();
  const { integrations, refetch } = useIntegrations();

  const { mutateAsync: createIntegrationApi } = useMutation<
    { _id: string; active: boolean },
    { error: string; message: string; statusCode: number },
    {
      providerId: string;
      channel: ChannelTypeEnum | null;
      credentials: ICredentialsDto;
      active: boolean;
      check: boolean;
    }
  >(createIntegration, {
    onSuccess: () => {
      refetch();
    },
  });

  useEffect(() => {
    if (!integrations || integrations?.length === 0) {
      return;
    }
    const integration = integrations.find((item) => {
      return item.channel === ChannelTypeEnum.IN_APP && item.providerId === InAppProviderIdEnum.Novu;
    });
    if (integration) {
      return;
    }
    createIntegrationApi({
      providerId: InAppProviderIdEnum.Novu,
      channel: ChannelTypeEnum.IN_APP,
      credentials: {
        hmac: false,
      },
      active: true,
      check: false,
    });
  }, [integrations]);

  useEffect(() => {
    segment.track(OnBoardingAnalyticsEnum.FLOW_SELECTED, { flow: FlowTypeEnum.IN_APP });
  }, []);

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
