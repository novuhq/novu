import { MessageRepository } from '@novu/dal';

const messageRepository = new MessageRepository();

export async function updateSeenRead() {
  // eslint-disable-next-line no-console
  console.log('start migration - update seen to read & add seen-true');

  // eslint-disable-next-line no-console
  console.log('rename all seen to read');

  await seenToRead();

  // eslint-disable-next-line no-console
  console.log('add in_app messages as seen');

  await inAppAsSeen();

  // eslint-disable-next-line no-console
  console.log('add not in_app messages as unseen (due the missing feature seen/unseen on other channels)');

  await notInAppAsUnseen();

  // eslint-disable-next-line no-console
  console.log('end migration');
}

export async function seenToRead() {
  await messageRepository.update({ read: { $exists: false } }, { $rename: { seen: 'read' } });
}

export async function inAppAsSeen() {
  await messageRepository.update(
    {
      channel: 'in_app',
      seen: { $exists: false },
    },
    { $set: { seen: true } }
  );
}

export async function notInAppAsUnseen() {
  await messageRepository.update(
    {
      channel: { $ne: 'in_app' },
      seen: { $exists: false },
    },
    { $set: { seen: false } }
  );
}
