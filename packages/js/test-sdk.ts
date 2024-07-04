/* cspell:disable */
import { Novu } from './src';

const test = async () => {
  const novu = new Novu({
    applicationIdentifier: 'i2Xc50K5Apnf',
    subscriberId: '6447afe9d89122e250412c10',
    backendUrl: 'http://localhost:3000',
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
};

test();
