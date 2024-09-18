/* eslint-disable max-len */

'use-client';

import { useState } from 'react';
import type { Notification } from '@novu/react';
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
      className="p-2 bg-white relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex flex-start relative">
        {/* Hover actions (desktop only) */}
        <div className="absolute top-0 right-0 hidden md:flex">
          {isHovered && (
            <div className="bg-white flex gap-2" style={{ color: '#37352fa6' }}>
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
        <div className="relative flex items-center mr-4 h-8">
          {!notification.isRead && (
            <div className="absolute top-1 left-0">
              <div className="w-2 h-2 bg-blue-500 rounded-full" />
            </div>
          )}
          {notification.avatar !== undefined && (
            <div className="ml-4 w-6 h-6">
              <div className="w-6 h-6 rounded-full overflow-hidden mr-2">
                <img
                  className="w-full h-full object-cover"
                  src={notification.avatar}
                  alt={`Avatar of ${notification.to.firstName}`}
                />
              </div>
            </div>
          )}
        </div>

        {/* Main content with conditional margin based on avatar */}
        <div className="flex-grow flex flex-col ml-auto mt-1 gap-2">
          <div className="flex justify-between w-full">
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
            <button className="Button variant-ghost size-sm flex items-center px-2 py-1 h-8 rounded-md hover:bg-gray-100">
              <GrDocumentText className="h-5 w-5 mr-2" />
              <span className="text-left text-sm text-gray-800 underline decoration-solid decoration-gray-400">
                {notification.body}
              </span>
            </button>
          )}
          {notificationType === 'Invite' && (
            <button className="Button variant-outline size-md flex items-center justify-between w-full px-4 py-2 rounded-md hover:bg-gray-100 text-left text-gray-800 border border-gray-300">
              {notification.body}
            </button>
          )}
          {notificationType === 'Comment' && (
            <div>
              <span className="text-sm text-gray-500 font-light">{notification.to.firstName}</span>
              <span className="text-base text-gray-800">{`This is a notification Comment made by ${notification.to.firstName} and posted on the page Top Secret Project`}</span>
            </div>
          )}

          <div className="flex space-x-3">
            {notification.primaryAction && (
              <button className="button text-sm variant-outline size-md colorScheme-gray rounded-md border border-gray-300 hover:bg-gray-100 px-2 py-1 h-8">
                {notification.primaryAction.label}
              </button>
            )}
            {notification.secondaryAction && (
              <button className="button text-sm variant-ghost size-md colorScheme-gray rounded-md border border-gray-300 hover:bg-gray-100 px-2 py-1 h-8">
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
