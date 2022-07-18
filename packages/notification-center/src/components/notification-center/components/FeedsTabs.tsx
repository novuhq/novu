import React, { useContext, useEffect, useState } from 'react';
import { Center, Tab } from '@mantine/core';
import { NotificationsListTab } from './NotificationsListTab';
import { INotificationCenterContext, ITab, IStoreQuery, IUnseenCount } from '../../../index';
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
                <Center inline>
                  {tab.name}
                  <UnseenBadgeContainer storeId={tab.storeId} />
                </Center>
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

function UnseenBadgeContainer({ storeId }: { storeId: string }) {
  const { api } = useApi();
  const { stores } = useNovuContext();

  const [unseenCount, setUnseenCount] = useState<number>();

  useEffect(() => {
    (async () => {
      const query = stores.find((i) => i.storeId === storeId)?.query || {};

      const { count } = await api.getUnseenCount(query);

      setUnseenCount(count);
    })();
  }, []);

  return <UnseenBadge unseenCount={unseenCount} />;
}
