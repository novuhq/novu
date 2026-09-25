import { afterEach, describe, expect, it } from 'vitest';
import type { Notification } from '../../../notifications';
import { NovuUI } from '../../novuUI';
import {
  createFakeNovu,
  createFakeNotification as createNotification,
  installAnimatePolyfill,
} from '../../testing/fakes';

const mountActions = (notification: Notification) => {
  const novuUI = new NovuUI({
    options: { applicationIdentifier: 'app', subscriberId: 'subscriber' },
    novu: createFakeNovu(),
  });
  const mountPoint = document.createElement('div');
  document.body.appendChild(mountPoint);
  const handle = novuUI.mountComponent({
    name: 'NotificationDefaultActions',
    element: mountPoint,
    props: { notification },
  });

  return { novuUI, mountPoint, handle };
};

describe('NotificationDefaultActions', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    document.head.innerHTML = '';
  });

  it('keeps the same buttons when the snapshot is replaced by an equal one', () => {
    const { novuUI, mountPoint, handle } = mountActions(createNotification());
    const readButton = mountPoint.querySelector('.nv-notificationRead__button');
    const archiveButton = mountPoint.querySelector('.nv-notificationArchive__button');
    expect(readButton).not.toBeNull();
    expect(archiveButton).not.toBeNull();

    // the optimistic update and the resolved response both arrive as new instances with the same values
    handle.update({ notification: createNotification() });

    expect(mountPoint.querySelector('.nv-notificationRead__button')).toBe(readButton);
    expect(mountPoint.querySelector('.nv-notificationArchive__button')).toBe(archiveButton);
    novuUI.unmount();
  });

  it('turns the read button into the unread button in place and keeps its open tooltip', () => {
    installAnimatePolyfill();
    const { novuUI, mountPoint, handle } = mountActions(createNotification());
    const button = mountPoint.querySelector('.nv-notificationRead__button') as HTMLButtonElement;

    button.dispatchEvent(new MouseEvent('mouseenter'));
    const tooltip = document.querySelector('.nv-tooltipContent');
    expect(tooltip?.textContent).toBe('Mark as read');

    handle.update({ notification: createNotification({ isRead: true }) });

    expect(mountPoint.querySelector('.nv-notificationUnread__button')).toBe(button);
    expect(mountPoint.querySelector('.nv-notificationRead__button')).toBeNull();
    expect(document.querySelector('.nv-tooltipContent')).toBe(tooltip);
    expect(tooltip?.textContent).toBe('Mark as unread');
    novuUI.unmount();
  });

  it('calls read or unread according to the current snapshot', async () => {
    const unread = createNotification();
    const { novuUI, mountPoint, handle } = mountActions(unread);
    const button = mountPoint.querySelector('.nv-notificationRead__button') as HTMLButtonElement;

    button.click();
    await Promise.resolve();
    expect(unread.read).toHaveBeenCalledTimes(1);

    const read = createNotification({ isRead: true });
    handle.update({ notification: read });
    button.click();
    await Promise.resolve();
    expect(read.unread).toHaveBeenCalledTimes(1);
    expect(read.read).not.toHaveBeenCalled();
    novuUI.unmount();
  });

  it('shows only unarchive for an archived notification and only unsnooze for a snoozed one', () => {
    const { novuUI, mountPoint, handle } = mountActions(createNotification({ isArchived: true }));
    expect(mountPoint.querySelector('.nv-notificationUnarchive__button')).not.toBeNull();
    expect(mountPoint.querySelector('.nv-notificationRead__button')).toBeNull();

    handle.update({ notification: createNotification({ isSnoozed: true }) });
    expect(mountPoint.querySelector('.nv-notificationUnsnooze__button')).not.toBeNull();
    expect(mountPoint.querySelector('.nv-notificationUnarchive__button')).toBeNull();
    novuUI.unmount();
  });
});
