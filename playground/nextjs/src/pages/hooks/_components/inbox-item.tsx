/* eslint-disable max-len */

'use-client';

import { useState } from 'react';
import type { Notification } from '@novu/nextjs';
import { PiNotificationFill } from 'react-icons/pi';
import { FaRegCheckSquare } from 'react-icons/fa';
import { FiArchive, FiCornerUpLeft } from 'react-icons/fi';
import { GrDocumentText } from 'react-icons/gr';
import { Show } from './show';

export const InboxItem = ({
  notification,
  status,
}: {
  notification: Notification;
  status: 'all' | 'unread' | 'archived';
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const notificationType = notification.tags?.[0];

  return (
    <div
      className="relative bg-white p-2"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex-start relative flex">
        {/* Hover actions (desktop only) */}
        <div className="absolute right-0 top-0 hidden md:flex">
          {isHovered && (
            <div className="flex gap-2 bg-white" style={{ color: '#37352fa6' }}>
              <Show when={status !== 'archived'}>
                {notification.isRead ? (
                  <button className="IconButton" aria-label="Mark as unread" onClick={() => notification.unread()}>
                    <PiNotificationFill className="h-4 w-4" />
                  </button>
                ) : (
                  <button className="IconButton" aria-label="Mark as read" onClick={() => notification.read()}>
                    <FaRegCheckSquare className="h-4 w-4" />
                  </button>
                )}
              </Show>
              {notification.isArchived ? (
                <button className="IconButton" aria-label="Unarchive" onClick={() => notification.unarchive()}>
                  <FiCornerUpLeft className="h-4 w-4" />
                </button>
              ) : (
                <button className="IconButton" aria-label="Archive" onClick={() => notification.archive()}>
                  <FiArchive className="h-4 w-4" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Avatar (with unread indicator) */}
        <div className="relative mr-4 flex h-8 items-center">
          {!notification.isRead && (
            <div className="absolute left-0 top-1">
              <div className="h-2 w-2 rounded-full bg-blue-500" />
            </div>
          )}
          {notification.avatar !== undefined && (
            <div className="ml-4 h-6 w-6">
              <div className="mr-2 h-6 w-6 overflow-hidden rounded-full">
                <img
                  className="h-full w-full object-cover"
                  src={notification.avatar}
                  alt={`Avatar of ${notification.to.firstName}`}
                />
              </div>
            </div>
          )}
        </div>

        {/* Main content with conditional margin based on avatar */}
        <div className="ml-auto mt-1 flex grow flex-col gap-2">
          <div className="flex w-full justify-between">
            <span className="text-left text-sm text-gray-800">{notification.subject}</span>
            <span className="text-sm text-gray-400">{formatTime(notification.createdAt)}</span>
          </div>

          {/* Notification body based on type */}
          {notificationType !== 'Mention' && notificationType !== 'Comment' && notificationType !== 'Invite' && (
            <span className="text-left text-sm text-gray-800" style={{ color: '#37352fa6' }}>
              {notification.body}
            </span>
          )}
          {(notificationType === 'Mention' || notificationType === 'Comment') && (
            <button className="Button variant-ghost size-sm flex h-8 items-center rounded-md px-2 py-1 hover:bg-gray-100">
              <GrDocumentText className="mr-2 h-5 w-5" />
              <span className="text-left text-sm text-gray-800 underline decoration-gray-400 decoration-solid">
                {notification.body}
              </span>
            </button>
          )}
          {notificationType === 'Invite' && (
            <button className="Button variant-outline size-md flex w-full items-center justify-between rounded-md border border-gray-300 px-4 py-2 text-left text-gray-800 hover:bg-gray-100">
              {notification.body}
            </button>
          )}
          {notificationType === 'Comment' && (
            <div>
              <span className="text-sm font-light text-gray-500">{notification.to.firstName}</span>
              <span className="text-base text-gray-800">{`This is a notification Comment made by ${notification.to.firstName} and posted on the page Top Secret Project`}</span>
            </div>
          )}

          <div className="flex space-x-3">
            {notification.primaryAction && (
              <button className="button variant-outline size-md colorScheme-gray h-8 rounded-md border border-gray-300 px-2 py-1 text-sm hover:bg-gray-100">
                {notification.primaryAction.label}
              </button>
            )}
            {notification.secondaryAction && (
              <button className="button variant-ghost size-md colorScheme-gray h-8 rounded-md border border-gray-300 px-2 py-1 text-sm hover:bg-gray-100">
                {notification.secondaryAction.label}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

function formatTime(timestamp: any) {
  const date = new Date(timestamp);
  const now = new Date().getTime();
  const diffInSeconds = Math.floor((now - date.getTime()) / 1000);

  // Time calculations
  const secondsInMinute = 60;
  const secondsInHour = secondsInMinute * 60;
  const secondsInDay = secondsInHour * 24;
  const secondsInWeek = secondsInDay * 7;
  const secondsInYear = secondsInDay * 365;

  if (diffInSeconds < secondsInMinute) {
    return `${diffInSeconds} seconds`;
  } else if (diffInSeconds < secondsInHour) {
    const minutes = Math.floor(diffInSeconds / secondsInMinute);

    return `${minutes} minutes`;
  } else if (diffInSeconds < secondsInDay) {
    const hours = Math.floor(diffInSeconds / secondsInHour);

    return `${hours} hours`;
  } else if (diffInSeconds < secondsInWeek) {
    const days = Math.floor(diffInSeconds / secondsInDay);

    return `${days} days`;
  } else if (diffInSeconds < secondsInYear) {
    const options: any = { month: 'short', day: 'numeric' };

    return date.toLocaleDateString(undefined, options); // e.g., "Feb 26"
  } else {
    return date.getFullYear().toString(); // e.g., "2022"
  }
}
