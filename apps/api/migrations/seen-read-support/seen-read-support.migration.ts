import { MessageRepository } from '@novu/dal';

const messageRepository = new MessageRepository();

const log = (message) => console.log(message);

const updateSeenRead = async () => {
  log('start migration - update seen to read & add seen-true');

  log('rename all seen to read');
  await seenToRead();

  log('add in_app messages as seen');
  await inAppAsSeen();

  log('add not in_app messages as unseen (due the missing feature seen/unseen on other channels)');
  await notInAppAsUnseen();

  log('end migration');
}

const seenToRead = async () => {
  await messageRepository.update({ read: { $exists: false } }, { $rename: { seen: 'read' } });
}

const inAppAsSeen = async () => {
  await messageRepository.update({
    channel: 'in_app',
    seen: { $exists: false },
  }, { $set: { seen: true } });
}

const notInAppAsUnseen = async () => {
  await messageRepository.update({
    channel: { $ne: 'in_app' },
    seen: { $exists: false },
  }, { $set: { seen: false } });
}

export {
  updateSeenRead,
  seenToRead,
  inAppAsSeen,
  notInAppAsUnseen,
};
