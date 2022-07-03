import React from 'react';
import { Tabs } from '@mantine/core';
import { useQuery } from 'react-query';
import { useApi } from '../../../hooks/use-api.hook';
import { NotificationsListTab } from './NotificationsListTab';

export function FeedsTabs() {
  const { api } = useApi();
  const { data: feeds, isLoading: isLoadingFeeds } = useQuery('getAllFeeds', () => api.getFeeds());

  return (
    <>
      {!isLoadingFeeds && feeds.length > 0 && (
        <Tabs>
          {feeds.map((feed) => (
            <Tabs.Tab key={feed._id} label={feed.name}>
              <NotificationsListTab feedId={feed._id} />
            </Tabs.Tab>
          ))}
        </Tabs>
      )}
    </>
  );
}
