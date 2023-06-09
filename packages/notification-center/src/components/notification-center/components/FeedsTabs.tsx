import React, { useMemo, useLayoutEffect } from 'react';
import { Tabs as MantineTabs } from '@mantine/core';
import styled from '@emotion/styled';

import { NotificationsListTab } from './NotificationsListTab';
import { UnseenBadge } from './UnseenBadge';
import { Tabs } from './layout/tabs/Tabs';
import { useNotificationCenter, useNotifications, useFeedUnseenCount, useNovuContext } from '../../../hooks';

export function FeedsTabs() {
  const { tabs, onTabClick } = useNotificationCenter();
  const { storeId, setStore, markFetchedNotificationsAsSeen } = useNotifications();
  const { setFetchingStrategy } = useNovuContext();

  async function handleOnTabChange(newStoreId: string) {
    markFetchedNotificationsAsSeen();
    setStore(newStoreId);
  }

  useLayoutEffect(() => {
    setFetchingStrategy({ fetchNotifications: true });
  }, [setFetchingStrategy]);

  return (
    <>
      {tabs?.length ? (
        <Tabs value={storeId} onTabChange={handleOnTabChange}>
          <MantineTabs.List>
            {tabs.map((tab, index) => (
              <MantineTabs.Tab
                onClick={() => {
                  onTabClick(tab);
                }}
                key={index}
                data-test-id={`tab-${tab.storeId}`}
                value={tab.storeId}
              >
                <TabLabelWrapper>
                  {tab.name}
                  <UnseenBadgeContainer storeId={tab.storeId} />
                </TabLabelWrapper>
              </MantineTabs.Tab>
            ))}
          </MantineTabs.List>
          {tabs.map((tab, index) => (
            <MantineTabs.Panel value={tab.storeId} key={index}>
              <NotificationsListTab />
            </MantineTabs.Panel>
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
  const { stores } = useNotifications();
  const query = useMemo(() => {
    const foundQuery = stores?.find((i) => i.storeId === storeId)?.query || {};

    return Object.assign({}, foundQuery, { seen: false, limit: 100 });
  }, [stores]);
  const { data } = useFeedUnseenCount({ query });
  const unseenCount = query.seen ? 0 : data?.count ?? 0;

  return <UnseenBadge unseenCount={unseenCount} />;
}
