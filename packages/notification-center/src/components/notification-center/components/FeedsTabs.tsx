import React, { useEffect, useState } from 'react';
import { Tabs as MantineTabs } from '@mantine/core';
import styled from 'styled-components';
import { NotificationsListTab } from './NotificationsListTab';
import { UnseenBadge } from './UnseenBadge';
import { Tabs } from './layout/tabs/Tabs';
import { useApi, useNotificationCenter, useNotifications, useUnseenCount } from '../../../hooks';
import { useFeed } from '../../../hooks/use-feed.hook';
import { IStore } from '../../../shared/interfaces';

export function FeedsTabs() {
  const { tabs, onTabClick } = useNotificationCenter();
  const { activeTabStoreId, setActiveTabStoreId } = useFeed();
  const { markAsSeen, refetch, onTabChange } = useNotifications({ storeId: activeTabStoreId });

  async function handleOnTabChange(storeId: string) {
    markAsSeen(null, true);
    refetch();
    onTabChange();
    setActiveTabStoreId(storeId);
  }

  return (
    <>
      {tabs?.length ? (
        <Tabs value={tabs[0].storeId} onTabChange={handleOnTabChange}>
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
              <NotificationsListTab tab={tab} />
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
  const { api } = useApi();
  const { stores } = useFeed();
  const { unseenCount: generalUnseenCount } = useUnseenCount();

  const [unseenCount, setUnseenCount] = useState<number>();

  useEffect(() => {
    setCount(stores, storeId, api, setUnseenCount);
  }, [generalUnseenCount]);

  return <UnseenBadge unseenCount={unseenCount} />;
}

async function setCount(
  stores: IStore[],
  storeId: string,
  api,
  setCountBadge: (value: ((prevState: number) => number) | number) => void
) {
  const query = stores?.find((i) => i.storeId === storeId)?.query || {};

  const unseenQuery = Object.assign({}, query, { seen: false });

  const { count } = await getTabCount(query, api, unseenQuery);

  setCountBadge(count);
}

async function getTabCount(query, api, unseenQuery: { seen: boolean }) {
  return query.seen ? 0 : await api.getTabCount(unseenQuery);
}
