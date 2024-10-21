'use client';

import { useMemo, useRef } from 'react';
import { useCounts, useNotifications } from '@novu/react';
import InfiniteScroll from 'react-infinite-scroll-component';
import { FiChevronDown, FiHome, FiInbox, FiSearch, FiSettings } from 'react-icons/fi';
import { BsFillFileTextFill, BsTrash } from 'react-icons/bs';
import { AiOutlineCalendar } from 'react-icons/ai';
import { FaUserFriends } from 'react-icons/fa';
import { EmptyIcon, NotionIcon } from './icons';
import { StatusDropdown } from './status-dropdown';
import { MoreActionsDropdown } from './more-actions-dropdown';
import { Show } from './show';
import { InboxItem } from './inbox-item';
import { SidebarItem } from './sidebar-item';
import { useStatus } from './status-context';

const EmptyNotificationList = () => {
  return (
    <div className={'absolute inset-0 flex flex-col items-center m-auto h-fit w-full text-[#E8E8E9]'}>
      <EmptyIcon />
      <p data-localization="notifications.emptyNotice">No notifications</p>
    </div>
  );
};

type SkeletonTextProps = { className?: string };

const SkeletonText = (props: SkeletonTextProps) => {
  return <div className={`w-full h-3 rounded bg-[#E8E8E9] ${props.className}`} />;
};

type SkeletonAvatarProps = { className?: string };
const SkeletonAvatar = (props: SkeletonAvatarProps) => {
  return <div className={`size-8 rounded-lg bg-[#E8E8E9] ${props.className ?? ''}`} />;
};

const NotificationSkeleton = () => {
  return (
    <>
      <div className="flex gap-2 p-4 w-full">
        <SkeletonAvatar />
        <div className={'flex flex-col self-stretch gap-3 flex-1'}>
          <SkeletonText className="w-1/4" />
          <div className="flex gap-1">
            <SkeletonText />
            <SkeletonText />
          </div>
          <div className="flex gap-1">
            <SkeletonText className="w-2/3" />
            <SkeletonText className="w-1/3" />
          </div>
        </div>
      </div>
    </>
  );
};

type NotificationListSkeletonProps = {
  count: number;
};

const NotificationListSkeleton = (props: NotificationListSkeletonProps) => {
  return (
    <>
      {Array.from({ length: props.count }).map((_, index) => (
        <NotificationSkeleton key={index} />
      ))}
    </>
  );
};

export const NotionTheme = () => {
  const notificationListElementRef = useRef<HTMLDivElement>(null);
  const { status } = useStatus();
  const filter = useMemo(() => {
    if (status === 'unread') {
      return { read: false };
    } else if (status === 'archived') {
      return { archived: true };
    }

    return { archived: false };
  }, [status]);

  const { counts } = useCounts({ filters: [{ read: false }] });
  const { notifications, isLoading, isFetching, hasMore, fetchMore, error } = useNotifications(filter);

  return (
    <div className="flex w-full max-w-[1200px] min-h-[600px] rounded-lg bg-white">
      <div className="flex-shrink-0 w-[240px] bg-[#f7f7f5] shadow-lg p-4 flex flex-col border-gray-200">
        <div className="flex items-center mb-4">
          <div className="flex items-center mr-4">
            <NotionIcon className="w-4 h-4 mr-2" />
            <span className="text-sm font-bold text-gray-800">Notion Workspace</span>
          </div>
          <button className="IconButton">
            <FiChevronDown className="h-5 w-5" />
          </button>
        </div>

        <nav className="space-y-0 mb-6">
          <SidebarItem icon={FiSearch} label="Search" />
          <SidebarItem icon={FiHome} label="Home" isActive />
          <SidebarItem icon={FiInbox} label="Inbox">
            {counts && counts[0].count > 0 && (
              <span className="flex items-center justify-center text-[10px] rounded h-4 min-w-4 bg-[#eb5757] text-white px-1 font-semibold !ml-auto">
                {counts[0].count}
              </span>
            )}
          </SidebarItem>
          <SidebarItem icon={FiSettings} label="Settings & members" />
        </nav>

        <h3 className="text-xs text-left font-bold text-gray-500 mb-2">Favorites</h3>
        <nav className="space-y-2 mb-6">
          <SidebarItem icon={FiHome} label="Teamspaces" />
          <SidebarItem icon={BsFillFileTextFill} label="Shared" />
        </nav>

        <h3 className="text-xs text-left font-bold text-gray-500 mb-2">Private</h3>
        <nav className="space-y-2 mb-6">
          <SidebarItem icon={AiOutlineCalendar} label="Calendar" />
          <SidebarItem icon={FaUserFriends} label="Templates" />
          <SidebarItem icon={BsTrash} label="Trash" />
        </nav>
      </div>

      <div className="relative flex-1 bg-white w-[400px] flex flex-col justify-center">
        <div className="flex shrink-0 justify-between items-center w-full py-5 px-6">
          <StatusDropdown />
          <MoreActionsDropdown />
        </div>
        <div ref={notificationListElementRef} className={'h-[800px] overflow-y-auto'} id="notifications-list">
          <Show when={!isLoading} fallback={<NotificationListSkeleton count={8} />}>
            <Show when={notifications && notifications.length > 0} fallback={<EmptyNotificationList />}>
              <InfiniteScroll
                dataLength={notifications?.length ?? 0}
                next={fetchMore}
                hasMore={hasMore}
                loader={
                  <>
                    {Array.from({ length: 3 }).map((_, idx) => (
                      <NotificationSkeleton key={idx} />
                    ))}
                  </>
                }
                endMessage={false}
                scrollableTarget="notifications-list"
              >
                {notifications?.map((notification) => {
                  return <InboxItem key={notification.id} notification={notification} status={status} />;
                })}
              </InfiniteScroll>
            </Show>
          </Show>
        </div>
      </div>
    </div>
  );
};
