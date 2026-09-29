import { describe, expect, it, vi } from 'vitest';
import type { Notification } from '../../../notifications';
import { ActionTypeEnum } from '../../../types';
import { createFakeNotification } from '../../testing/fakes';
import { createNotificationItemController, isInsideIsland } from './controller';

const createNotification = (overrides: Partial<Notification> = {}) =>
  createFakeNotification({
    redirect: { url: 'https://example.com', target: '_blank' },
    primaryAction: { label: 'Approve', isCompleted: false, redirect: { url: '/approved' } },
    ...overrides,
  });

const createEvent = (target: EventTarget | null = document.createElement('a')) => {
  const event: Partial<MouseEvent> = { target, stopPropagation: vi.fn(), preventDefault: vi.fn() };

  return event as MouseEvent;
};

describe('notification item controller', () => {
  it('marks the notification read, calls the handler, and follows the redirect on click', async () => {
    const notification = createNotification();
    const onNotificationClick = vi.fn();
    const navigate = vi.fn();
    const controller = createNotificationItemController({
      notification: () => notification,
      handlers: () => ({ onNotificationClick }),
      navigate,
    });
    const event = createEvent();

    await controller.handleClick(event);

    expect(event.stopPropagation).toHaveBeenCalled();
    expect(notification.read).toHaveBeenCalledTimes(1);
    expect(onNotificationClick).toHaveBeenCalledWith(notification);
    expect(navigate).toHaveBeenCalledWith('https://example.com', '_blank');
  });

  it('leaves a click that started inside an island to the island', async () => {
    const notification = createNotification();
    const navigate = vi.fn();
    const controller = createNotificationItemController({
      notification: () => notification,
      handlers: () => ({}),
      navigate,
    });
    const island = document.createElement('div');
    island.setAttribute('data-novu-island', '');
    const button = document.createElement('button');
    island.appendChild(button);
    const event = createEvent(button);

    await controller.handleClick(event);

    expect(isInsideIsland(button)).toBe(true);
    expect(event.stopPropagation).not.toHaveBeenCalled();
    expect(notification.read).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('does not mark an already read notification read again', async () => {
    const notification = createNotification({ isRead: true });
    const controller = createNotificationItemController({
      notification: () => notification,
      handlers: () => ({}),
      navigate: vi.fn(),
    });

    await controller.handleClick(createEvent());

    expect(notification.read).not.toHaveBeenCalled();
  });

  it('completes the primary action, calls its handler and follows its redirect', async () => {
    const notification = createNotification();
    const onPrimaryActionClick = vi.fn();
    const navigate = vi.fn();
    const controller = createNotificationItemController({
      notification: () => notification,
      handlers: () => ({ onPrimaryActionClick }),
      navigate,
    });

    await controller.handleActionClick(ActionTypeEnum.PRIMARY, createEvent());

    expect(notification.completePrimary).toHaveBeenCalledTimes(1);
    expect(onPrimaryActionClick).toHaveBeenCalledWith(notification);
    expect(navigate).toHaveBeenCalledWith('/approved', undefined);
  });

  it('is clickable while unread or while it has a redirect', () => {
    const controller = (notification: Notification) =>
      createNotificationItemController({ notification: () => notification, handlers: () => ({}), navigate: vi.fn() });

    expect(controller(createNotification({ isRead: true })).isClickable()).toBe(true);
    expect(controller(createNotification({ isRead: true, redirect: undefined })).isClickable()).toBe(false);
    expect(controller(createNotification({ isRead: false, redirect: undefined })).isClickable()).toBe(true);
  });
});
