import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Notification } from '../../../notifications';
import { NovuUI } from '../../novuUI';
import {
  createFakeNovu,
  createFakeNotification as createNotification,
  installAnimatePolyfill,
} from '../../testing/fakes';
import { TOOLTIP_OPEN_DELAY_MS, TOOLTIP_SKIP_DELAY_MS } from '../primitives/Tooltip';

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
    vi.useRealTimers();
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

    vi.useFakeTimers();
    button.dispatchEvent(new MouseEvent('mouseenter'));
    expect(document.querySelector('.nv-tooltipContent')).toBeNull();
    vi.advanceTimersByTime(TOOLTIP_OPEN_DELAY_MS);
    const tooltip = document.querySelector('.nv-tooltipContent');
    expect(tooltip?.textContent).toBe('Mark as read');

    handle.update({ notification: createNotification({ isRead: true }) });

    expect(mountPoint.querySelector('.nv-notificationUnread__button')).toBe(button);
    expect(mountPoint.querySelector('.nv-notificationRead__button')).toBeNull();
    expect(document.querySelector('.nv-tooltipContent')).toBe(tooltip);
    expect(tooltip?.textContent).toBe('Mark as unread');
    novuUI.unmount();
  });

  it('opens a tooltip only after the pointer rests, and the next one at once while moving along the row', () => {
    vi.useFakeTimers();
    const { novuUI, mountPoint } = mountActions(createNotification());
    const readButton = mountPoint.querySelector('.nv-notificationRead__button') as HTMLButtonElement;
    const archiveButton = mountPoint.querySelector('.nv-notificationArchive__button') as HTMLButtonElement;
    const tooltipText = () => document.querySelector('.nv-tooltipContent')?.textContent;

    // Passing over a button doesn't flash its tooltip.
    readButton.dispatchEvent(new MouseEvent('mouseenter'));
    vi.advanceTimersByTime(TOOLTIP_OPEN_DELAY_MS - 1);
    readButton.dispatchEvent(new MouseEvent('mouseleave'));
    vi.advanceTimersByTime(TOOLTIP_OPEN_DELAY_MS);
    expect(tooltipText()).toBeUndefined();

    readButton.dispatchEvent(new MouseEvent('mouseenter'));
    vi.advanceTimersByTime(TOOLTIP_OPEN_DELAY_MS);
    expect(tooltipText()).toBe('Mark as read');

    readButton.dispatchEvent(new MouseEvent('mouseleave'));
    archiveButton.dispatchEvent(new MouseEvent('mouseenter'));
    expect(tooltipText()).toBe('Archive');

    // Once the row has been left for longer than the skip window, the delay applies again.
    archiveButton.dispatchEvent(new MouseEvent('mouseleave'));
    vi.advanceTimersByTime(TOOLTIP_SKIP_DELAY_MS);
    readButton.dispatchEvent(new MouseEvent('mouseenter'));
    expect(tooltipText()).toBeUndefined();
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
