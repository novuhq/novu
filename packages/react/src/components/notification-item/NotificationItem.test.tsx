import type { Notification } from '@novu/js';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { NovuUIProvider } from '../../context/NovuUIContext';
import { OutletStore } from '../../context/OutletStore';
import { NotificationHandlersProvider } from './context';
import { NotificationItem } from './NotificationItem';

const elements = {};
const classMap = {};
const dictionary = { 'notification.snoozedUntil': 'Snoozed until' };

type MountCall = { name: string; bare?: boolean };

const createEngine = () => {
  const mountComponent = vi.fn((_params: MountCall) => ({ update: vi.fn(), unmount: vi.fn() }));
  const navigate = vi.fn();
  const novuUI = {
    mountComponent,
    stores: {
      appearance: { elements: () => elements, appearanceKeyToCssInJsClass: () => classMap },
      localization: {
        t: (key: string) => dictionary[key as keyof typeof dictionary] ?? key,
        locale: () => 'en-US',
        dictionary: () => dictionary,
      },
      inbox: { navigate },
    },
  };

  return { novuUI: novuUI as never, mountComponent, navigate };
};

const createNotification = (overrides: Partial<Notification> = {}) =>
  ({
    id: '1',
    subject: 'Deploy **finished**',
    body: 'Build 42 is live',
    isRead: false,
    createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    redirect: { url: '/deploys/42' },
    read: vi.fn(async () => ({})),
    ...overrides,
  }) as unknown as Notification;

const renderItem = (ui: React.ReactElement, engine = createEngine(), inherited: Record<string, unknown> = {}) => {
  const view = render(
    <NovuUIProvider value={{ novuUI: engine.novuUI, outlets: new OutletStore(), icons: {} }}>
      <NotificationHandlersProvider value={inherited}>{ui}</NotificationHandlersProvider>
    </NovuUIProvider>
  );

  return { ...view, engine };
};

describe('NotificationItem', () => {
  it('renders the built-in arrangement with the engine appearance keys and both action islands', () => {
    const notification = createNotification();
    const { container, engine } = renderItem(<NotificationItem notification={notification} />);

    const root = container.querySelector('a') as HTMLAnchorElement;
    expect(root.className).toContain('nv-notification');
    expect(container.querySelector('.nv-notificationSubject')?.textContent).toBe('Deploy finished');
    expect(container.querySelector('.nv-notificationSubject strong')?.textContent).toBe('finished');
    expect(container.querySelector('.nv-notificationBody')?.textContent).toBe('Build 42 is live');
    expect(container.querySelector('.nv-notificationDate')?.textContent).toContain('5');
    expect(container.querySelector('.nv-notificationDot')).not.toBeNull();

    const islands = engine.mountComponent.mock.calls.map((call) => call[0]);
    expect(islands.map((island) => island.name)).toEqual(['NotificationDefaultActions', 'NotificationCustomActions']);
    expect(islands.every((island) => island.bare)).toBe(true);
  });

  it('renders exactly the parts a host passes as children', () => {
    const { container } = renderItem(
      <NotificationItem notification={createNotification()}>
        <NotificationItem.Date />
        <NotificationItem.Subject />
      </NotificationItem>
    );

    expect(container.querySelector('.nv-notificationSubject')).not.toBeNull();
    expect(container.querySelector('.nv-notificationDate')).not.toBeNull();
    expect(container.querySelector('.nv-notificationBody')).toBeNull();
    expect(container.querySelector('.nv-notificationDot')).toBeNull();
  });

  it('swaps one part through a render prop while keeping the rest', () => {
    const { container } = renderItem(
      <NotificationItem
        notification={createNotification()}
        renderBody={(n) => <span data-testid="body">{n.body}!</span>}
      />
    );

    expect(screen.getByTestId('body').textContent).toBe('Build 42 is live!');
    expect(container.querySelector('.nv-notificationBody')).toBeNull();
    expect(container.querySelector('.nv-notificationSubject')).not.toBeNull();
  });

  it('marks the notification read, calls the inherited handler and follows the redirect on click', async () => {
    const notification = createNotification();
    const onNotificationClick = vi.fn();
    const { container, engine } = renderItem(<NotificationItem notification={notification} />, createEngine(), {
      onNotificationClick,
    });

    fireEvent.click(container.querySelector('a') as HTMLAnchorElement);
    await Promise.resolve();
    await Promise.resolve();

    expect(notification.read).toHaveBeenCalledTimes(1);
    expect(onNotificationClick).toHaveBeenCalledWith(notification);
    expect(engine.navigate).toHaveBeenCalledWith('/deploys/42', undefined);
  });

  it('leaves clicks that start inside an island to the island', async () => {
    const notification = createNotification();
    const { engine } = renderItem(
      <NotificationItem notification={notification}>
        <div data-novu-island="">
          <button type="button">archive</button>
        </div>
      </NotificationItem>
    );

    fireEvent.click(screen.getByText('archive'));
    await Promise.resolve();

    expect(notification.read).not.toHaveBeenCalled();
    expect(engine.navigate).not.toHaveBeenCalled();
  });

  it('hides the dot once the notification is read', () => {
    const { container } = renderItem(<NotificationItem notification={createNotification({ isRead: true })} />);

    expect(container.querySelector('.nv-notificationDot')).toBeNull();
  });
});
