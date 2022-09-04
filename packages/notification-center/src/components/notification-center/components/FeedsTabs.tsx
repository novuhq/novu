import React, { useContext, useEffect, useState } from 'react';
import { Tab } from '@mantine/core';
import styled from 'styled-components';
import { NotificationsListTab } from './NotificationsListTab';
import { INotificationCenterContext, useUnseenCount } from '../../../index';
import { UnseenBadge } from './UnseenBadge';
import { Tabs } from './layout/tabs/Tabs';
import { NotificationCenterContext } from '../../../store';
import { useApi, useNovuContext } from '../../../hooks';

export function FeedsTabs() {
  const { tabs, onTabClick } = useContext<INotificationCenterContext>(NotificationCenterContext);

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
              onClick={() => {
                onTabClick(tab);
              }}
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
  const { unseenCount: generalUnseenCount } = useUnseenCount();

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
