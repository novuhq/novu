import React, { useContext, useEffect, useState } from 'react';
import { Center, Tab } from '@mantine/core';
import styled from 'styled-components';
import { NotificationsListTab } from './NotificationsListTab';
import { INotificationCenterContext } from '../../../index';
import { UnseenBadge } from './UnseenBadge';
import { UnseenCountContext } from '../../../store/unseen-count.context';
import { Tabs } from './layout/tabs/Tabs';
import { NotificationCenterContext } from '../../../store/notification-center.context';
import { useApi, useNovuContext } from '../../../hooks';

export function FeedsTabs() {
  const { tabs } = useContext<INotificationCenterContext>(NotificationCenterContext);

  return (
    <>
      {tabs?.length ? (
        <Tabs>
          {tabs.map((tab, index) => (
            <Tab
              key={index}
              label={
                <TabLabelWrapper>
                  {tab.name}
                  <UnseenBadgeContainer storeId={tab.storeId} />
                </TabLabelWrapper>
              }
            >
              <NotificationsListTab tab={tab} />
            </Tab>
          ))}
        </Tabs>
      ) : (
        <NotificationsListTab />
      )}
    </>
  );
}

const TabLabelWrapper = styled.div`
  margin-bottom: 13px;
  min-height: 22px;
  line-height: 19px;
`;

function UnseenBadgeContainer({ storeId }: { storeId: string }) {
  const { api } = useApi();
  const { stores } = useNovuContext();
  const { unseenCount: generalUnseenCount } = useContext(UnseenCountContext);

  const [unseenCount, setUnseenCount] = useState<number>();

  useEffect(() => {
    (async () => {
      const query = stores?.find((i) => i.storeId === storeId)?.query || {};

      const { count } = await api.getUnseenCount(query);

      setUnseenCount(count);
    })();
  }, [generalUnseenCount]);

  return <UnseenBadge unseenCount={unseenCount} />;
}
