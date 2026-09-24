import type { Notification } from '@novu/js';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { NotificationItem as ClientNotificationItem } from '../components/notification-item/NotificationItem';
import { NotificationItem } from './index';

const partNames = (item: object) =>
  Object.entries(item)
    .filter(([, value]) => typeof value === 'function')
    .map(([name]) => name)
    .sort();

describe('server NotificationItem', () => {
  it('exposes the same parts as the client item', () => {
    expect(partNames(NotificationItem)).toEqual(partNames(ClientNotificationItem));
  });

  it('accepts the client props and renders nothing on the server', () => {
    const partial: Partial<Notification> = { id: 'n1', subject: 'Hello', isRead: false };
    const notification = partial as Notification;

    const html = renderToStaticMarkup(
      <NotificationItem notification={notification} className="row" onNotificationClick={() => undefined}>
        <NotificationItem.Avatar className="avatar" />
        <NotificationItem.Content>
          <NotificationItem.Subject>Hello</NotificationItem.Subject>
          <NotificationItem.DefaultActions />
        </NotificationItem.Content>
      </NotificationItem>
    );

    expect(html).toBe('');
  });
});
