import React, { useEffect, useState } from 'react';

import { useSegment } from '../../../components/providers/SegmentProvider';
import { GetStartedLayout } from '../components/layout/GetStartedLayout';
import { getStartedSteps } from '../consts';
import { NavButton } from './DigestPreview';
import { ArrowRight } from '../../../design-system/icons/arrows/ArrowRight';
import { ChannelsConfiguration } from '../components/ChannelsConfiguration';
import { HeaderSecondaryTitle } from '../components/layout/HeaderLayout';
import { IntegrationsStoreModal } from '../../integrations/IntegrationsStoreModal';
import { ChannelTypeEnum } from '@novu/shared';

export function GetStarted() {
  const segment = useSegment();
  const [clickedChannel, setClickedChannel] = useState<{
    open: boolean;
    channelType?: ChannelTypeEnum;
  }>({ open: false });

  useEffect(() => {
    // segment.track(OnBoardingAnalyticsEnum.QUICK_START_VISIT);
  }, []);

  return (
    <GetStartedLayout
      header={<HeaderSecondaryTitle>Quick Start Guide</HeaderSecondaryTitle>}
      footer={{
        leftSide: <LearnMoreRef />,
        rightSide: (
          <NavButton navigateTo={getStartedSteps.second} variant={'gradient'}>
            <div style={{ fontSize: '16px' }}>Next Page</div>
            <ArrowRight style={{ marginLeft: '10px' }} />
          </NavButton>
        ),
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
        <IntegrationsStoreModal
          openIntegration={clickedChannel.open}
          closeIntegration={() => {
            setClickedChannel({ open: false });
          }}
        />
        <ChannelsConfiguration setClickedChannel={setClickedChannel} />
      </div>
    </GetStartedLayout>
  );
}

function LearnMoreRef() {
  function handleOnClick() {
    /*
     * todo add optional event
     * segment.track(OnBoardingAnalyticsEnum);
     */
  }

  return (
    <a
      href={'https://docs.novu.co/platform/digest/'}
      style={{ color: '#DD2476', textDecoration: 'underline', fontSize: '18px' }}
      onClick={() => handleOnClick}
      target="_blank"
      rel="noreferrer"
    >
      Learn more in the docs
    </a>
  );
}
