import React, { useContext } from 'react';
import { Center, Tab } from '@mantine/core';
import { NotificationsListTab } from './NotificationsListTab';
import { IFeedsContext } from '../../../index';
import { FeedsContext } from '../../../store/feeds.context';
import { UnseenBadge } from './UnseenBadge';
import { UnseenCountContext } from '../../../store/unseen-count.context';
import { Tabs } from './layout/tabs/Tabs';

export interface ITab {
  name: string;
  query?: { feedId: string | string[] };
}

interface IFeedsTabsProps {
  tabs: ITab[];
}

export function FeedsTabs(props: IFeedsTabsProps) {
  const { feeds } = useContext<IFeedsContext>(FeedsContext);
  const { unseenCount } = useContext(UnseenCountContext);

  const getCount = (feedId) => {
    return unseenCount?.feeds.find((feedCount) => feedCount._id === feedId)?.count;
  };

  return (
    <>
      {props.tabs?.length ? (
        <Tabs>
          {props.tabs.map((tab, index) => (
            <Tab
              key={index}
              label={
                <Center inline>
                  {tab.name}
                  <UnseenBadge unseenCount={tab.query ? getCount(tab.query?.feedId) : unseenCount.count} />
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
