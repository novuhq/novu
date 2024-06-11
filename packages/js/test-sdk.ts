import { Novu } from './src';
import { NotificationStatus } from './src/types';

const novu = new Novu({
  applicationIdentifier: '3RB-pKkUG2uu',
  subscriberId: '63497a94e2a2de81df1e8dac',
});

novu.on('feeds.mark_notifications_as.pending', ({ args, optimistic }) => {});
novu.on('feeds.mark_notifications_as.success', ({ args, result }) => {});
novu.on('feeds.mark_notifications_as.error', ({ args, error, fallback }) => {});

novu.on('notification.remove.pending', ({ args, optimistic }) => {
  console.log('notification.remove.pending', args);
});
novu.on('notification.remove.success', (args) => {
  console.log('notification.remove.suceess', args);
});
novu.on('notification.remove.error', (args) => {
  console.log('notification.remove.error', args);
});

const feed = await novu.feeds.fetch();
console.log(feed);

const notification1 = await novu.feeds.markNotificationAs({
  id: '123',
  status: NotificationStatus.SEEN,
});
const notification2 = await novu.feeds.markNotificationAs({
  notification: feed.data[0],
  status: NotificationStatus.SEEN,
});
const notifications = await novu.feeds.markNotificationsAs({
  ids: [''],
  status: NotificationStatus.SEEN,
});
const notifications2 = await novu.feeds.markNotificationsAs({
  notifications: [],
  status: NotificationStatus.SEEN,
});

console.log(feed);
