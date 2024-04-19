import { useEffect, useState } from 'react';
import styled from '@emotion/styled';
import { ChannelTypeEnum, UTM_CAMPAIGN_QUERY_PARAM } from '@novu/shared';
import { ArrowRight } from '@novu/design-system';

import { useSegment } from '../../../components/providers/SegmentProvider';
import { IntegrationsListModal } from '../../integrations/IntegrationsListModal';
import { ChannelsConfiguration } from '../components/ChannelsConfiguration';
import { GetStartedLayout } from '../components/layout/GetStartedLayout';
import { NavButton } from '../components/NavButton';
import { getStartedSteps, OnBoardingAnalyticsEnum } from '../consts';
import { OnboardingExperimentModal } from '../components/OnboardingExperimentModal';
import { useAuthContext } from '@novu/shared-web';
import { OnboardingExperimentV2ModalKey } from '../../../constants/experimentsConstants';

const ChannelsConfigurationHolder = styled.div`
  display: flex;
  margin-left: 20px;

  @media screen and (min-width: 1369px) {
    margin-left: 40px;
  }

  @media screen and (min-width: 1921px) {
    margin-left: 8vw;
  }
`;

export function GetStarted() {
  const segment = useSegment();
  const { currentOrganization } = useAuthContext();
  const [clickedChannel, setClickedChannel] = useState<{
    open: boolean;
    channelType?: ChannelTypeEnum;
  }>({ open: false });

  const isOnboardingModalEnabled =
    localStorage.getItem(OnboardingExperimentV2ModalKey) === 'true' && window.innerWidth > 768;

  const onIntegrationModalClose = () => setClickedChannel({ open: false });

  useEffect(() => {
    segment.track(OnBoardingAnalyticsEnum.CONFIGURE_PROVIDER_VISIT);
  }, [currentOrganization?._id, isOnboardingModalEnabled, segment]);

  function handleOnClick() {
    segment.track(OnBoardingAnalyticsEnum.CONFIGURE_PROVIDER_NAVIGATION_NEXT_PAGE_CLICK);
  }

  return (
    <GetStartedLayout
      footer={{
        leftSide: <LearnMoreRef />,
        rightSide: (
          <NavButton navigateTo={getStartedSteps.second} variant={'gradient'} handleOnClick={handleOnClick}>
            <div style={{ fontSize: '16px' }}>Next</div>
            <ArrowRight style={{ marginLeft: '10px' }} />
          </NavButton>
        ),
      }}
    >
      <ChannelsConfigurationHolder>
        <IntegrationsListModal
          isOpen={clickedChannel.open}
          onClose={onIntegrationModalClose}
          scrollTo={clickedChannel.channelType}
        />
        <ChannelsConfiguration setClickedChannel={setClickedChannel} />
      </ChannelsConfigurationHolder>
      {isOnboardingModalEnabled && <OnboardingExperimentModal />}
    </GetStartedLayout>
  );
}

function LearnMoreRef() {
  const segment = useSegment();

  function handleOnClick() {
    segment.track(OnBoardingAnalyticsEnum.CONFIGURE_PROVIDER_LEARN_MORE_CLICK);
  }

  return (
    <a
      href={`https://docs.novu.co/quickstarts/01-introduction${UTM_CAMPAIGN_QUERY_PARAM}`}
      style={{ color: '#DD2476', textDecoration: 'underline', fontSize: '18px' }}
      onClick={() => handleOnClick}
      target="_blank"
      rel="noreferrer"
    >
      Learn more in the docs
    </a>
  );
}
