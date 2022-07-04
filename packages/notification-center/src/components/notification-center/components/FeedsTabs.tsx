import React, { useContext } from 'react';
import { Center, Tab } from '@mantine/core';
import { useQuery } from 'react-query';
import { useApi } from '../../../hooks/use-api.hook';
import { NotificationsListTab } from './NotificationsListTab';
import { UnseenBadge } from './UnseenBadge';
import { UnseenCountContext } from '../../../store/unseen-count.context';
import { Tabs } from './layout/tabs/Tabs';

export function FeedsTabs() {
  const { api } = useApi();
  const { unseenCount } = useContext(UnseenCountContext);
  const { data: feeds, isLoading: isLoadingFeeds } = useQuery('getAllFeeds', () => api.getFeeds());

  return (
    <>
      {!isLoadingFeeds && feeds.length > 0 && (
        <Tabs>
          {feeds.map((feed) => (
            <Tab
              key={feed._id}
              label={
                <Center inline>
                  {feed.name} <UnseenBadge unseenCount={unseenCount} />
                </Center>
              }
            >
              <NotificationsListTab feedId={feed._id} />
            </Tab>
          ))}
        </Tabs>
      )}
    </>
  );
}
