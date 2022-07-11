import React, { useContext } from 'react';
import { Center, Tab } from '@mantine/core';
import { NotificationsListTab } from './NotificationsListTab';
import { IFeedsContext } from '../../../index';
import { FeedsContext } from '../../../store/feeds.context';
import { UnseenBadge } from './UnseenBadge';
import { UnseenCountContext } from '../../../store/unseen-count.context';
import { Tabs } from './layout/tabs/Tabs';

export function FeedsTabs({ tabs }: { tabs?: { name: string; query?: { feedId: string | string[] } }[] }) {
  const { feeds } = useContext<IFeedsContext>(FeedsContext);
  const { unseenCount } = useContext(UnseenCountContext);

  const getCount = (feedId) => {
    const count = unseenCount?.feeds.find((feedCount) => feedCount._id === feedId)?.count;

    return count;
  };

  return (
    <>
      {tabs?.length ? (
        <Tabs>
          {tabs.map((feed, index) => (
            <Tab
              key={index}
              label={
                <Center inline>
                  {feed.name}{' '}
                  <UnseenBadge unseenCount={feed.query ? getCount(feed.query?.feedId) : unseenCount.count} />
                </Center>
              }
            >
              <NotificationsListTab feedId={feed.query ? feed.query?.feedId : ''} />
            </Tab>
          ))}
        </Tabs>
      ) : (
        <NotificationsListTab />
      )}
    </>
  );
}
