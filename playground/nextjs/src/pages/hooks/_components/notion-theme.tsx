'use client';

import { useMemo, useRef } from 'react';
import { useCounts, useNotifications } from '@novu/nextjs';
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
    <div className={'absolute inset-0 m-auto flex h-fit w-full flex-col items-center text-[#E8E8E9]'}>
      <EmptyIcon />
      <p data-localization="notifications.emptyNotice">No notifications</p>
    </div>
  );
};

type SkeletonTextProps = { className?: string };

const SkeletonText = (props: SkeletonTextProps) => {
  return <div className={`h-3 w-full rounded bg-[#E8E8E9] ${props.className}`} />;
};

type SkeletonAvatarProps = { className?: string };
const SkeletonAvatar = (props: SkeletonAvatarProps) => {
  return <div className={`size-8 rounded-lg bg-[#E8E8E9] ${props.className ?? ''}`} />;
};

const NotificationSkeleton = () => {
  return (
    <>
      <div className="flex w-full gap-2 p-4">
        <SkeletonAvatar />
        <div className={'flex flex-1 flex-col gap-3 self-stretch'}>
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
    <div className="flex min-h-[600px] w-full max-w-[1200px] rounded-lg bg-white">
      <div className="flex w-[240px] shrink-0 flex-col border-gray-200 bg-[#f7f7f5] p-4 shadow-lg">
        <div className="mb-4 flex items-center">
          <div className="mr-4 flex items-center">
            <NotionIcon className="mr-2 h-4 w-4" />
            <span className="text-sm font-bold text-gray-800">Notion Workspace</span>
          </div>
          <button className="IconButton">
            <FiChevronDown className="h-5 w-5" />
          </button>
        </div>

        <nav className="mb-6 space-y-0">
          <SidebarItem icon={FiSearch} label="Search" />
          <SidebarItem icon={FiHome} label="Home" isActive />
          <SidebarItem icon={FiInbox} label="Inbox">
            {counts && counts[0].count > 0 && (
              <span className="ml-auto! flex h-4 min-w-4 items-center justify-center rounded bg-[#eb5757] px-1 text-[10px] font-semibold text-white">
                {counts[0].count}
              </span>
            )}
          </SidebarItem>
          <SidebarItem icon={FiSettings} label="Settings & members" />
        </nav>

        <h3 className="mb-2 text-left text-xs font-bold text-gray-500">Favorites</h3>
        <nav className="mb-6 space-y-2">
          <SidebarItem icon={FiHome} label="Teamspaces" />
          <SidebarItem icon={BsFillFileTextFill} label="Shared" />
        </nav>

        <h3 className="mb-2 text-left text-xs font-bold text-gray-500">Private</h3>
        <nav className="mb-6 space-y-2">
          <SidebarItem icon={AiOutlineCalendar} label="Calendar" />
          <SidebarItem icon={FaUserFriends} label="Templates" />
          <SidebarItem icon={BsTrash} label="Trash" />
        </nav>
      </div>

      <div className="relative flex w-[400px] flex-1 flex-col justify-center bg-white">
        <div className="flex w-full shrink-0 items-center justify-between px-6 py-5">
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
