import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Notifications } from '../../notifications';
import type { Novu } from '../../novu';
import { NovuUI } from '../novuUI';
import { createFakeNotificationsApi, createFakeNovu, stubRunningExitAnimation } from '../testing/fakes';
import type { Tab } from '../types';

const createEngine = (tabs?: Tab[]) => {
  const notifications = createFakeNotificationsApi({
    list: vi.fn(async () => ({ data: { notifications: [], hasMore: false, filter: {} } })) as Notifications['list'],
    clearCache: vi.fn(),
  });
  const novu = createFakeNovu({
    notifications,
    preferences: { list: vi.fn(async () => ({ data: [] })) } as unknown as Novu['preferences'],
  });

  return new NovuUI({ options: { applicationIdentifier: 'app', subscriberId: 'subscriber' }, novu, tabs });
};

const mount = (name: 'Inbox' | 'InboxContent' | 'Notifications', tabs?: Tab[]) => {
  const novuUI = createEngine(tabs);
  const mountPoint = document.createElement('div');
  document.body.appendChild(mountPoint);
  novuUI.mountComponent({ name, element: mountPoint, props: {} });

  return { novuUI, mountPoint };
};

const page = (root: ParentNode, name: 'notifications' | 'preferences') =>
  root.querySelector<HTMLElement>(`.nv-inboxPage[data-page="${name}"]`);

const click = (element: Element | null) => {
  element?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
};

/** Solid sets `inert` as a property; browsers reflect it to the attribute, jsdom does not. */
const isInert = (element: HTMLElement | null | undefined) => (element as { inert?: boolean } | null)?.inert === true;

const pressEscape = () => {
  document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
};

describe('Inbox motion', () => {
  beforeEach(() => {
    // `createInfiniteScroll` observes the end of the list; jsdom has no IntersectionObserver.
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      }
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
    document.head.innerHTML = '';
  });

  it('slides between the pages in the direction of the navigation, keeping the leaving page inert', () => {
    const { novuUI, mountPoint } = mount('InboxContent');
    const notificationsPage = page(mountPoint, 'notifications');
    expect(notificationsPage?.hasAttribute('data-direction')).toBe(false);

    const exit = stubRunningExitAnimation(notificationsPage as HTMLElement);
    click(mountPoint.querySelector('.nv-preferences__button'));

    const preferencesPage = page(mountPoint, 'preferences');
    expect(preferencesPage?.dataset.state).toBe('open');
    expect(preferencesPage?.dataset.direction).toBe('forward');
    // The notifications page plays its exit in the same cell and is out of the tab order meanwhile.
    expect(notificationsPage?.dataset.state).toBe('closed');
    expect(isInert(notificationsPage)).toBe(true);

    exit.finish();
    return vi.waitFor(() => {
      expect(page(mountPoint, 'notifications')).toBeNull();

      click(mountPoint.querySelector('.nv-preferencesHeader__back__button'));
      expect(page(mountPoint, 'notifications')?.dataset.direction).toBe('backward');
      novuUI.unmount();
    });
  });

  it('slides between the tab panels in the direction of the switch, keeping the leaving panel inert', async () => {
    const { novuUI, mountPoint } = mount('InboxContent', [
      { label: 'All', filter: { tags: [] } },
      { label: 'Promotions', filter: { tags: ['promotions'] } },
    ]);
    const panel = (label: string) =>
      mountPoint.querySelector<HTMLElement>(`[role="tabpanel"][aria-labelledby="${label}"]`);
    const first = panel('All');
    expect(first?.dataset.state).toBe('active');
    expect(first?.hasAttribute('data-direction')).toBe(false);

    const exit = stubRunningExitAnimation(first as HTMLElement);
    click(mountPoint.querySelector('[role="tab"][id="Promotions"]'));

    expect(panel('Promotions')?.dataset.state).toBe('active');
    expect(panel('Promotions')?.dataset.direction).toBe('forward');
    // The previous panel plays its exit in the same grid cell and is out of the tab order meanwhile.
    expect(first?.dataset.state).toBe('inactive');
    expect(isInert(first)).toBe(true);
    expect(mountPoint.contains(first)).toBe(true);

    exit.finish();
    await vi.waitFor(() => expect(mountPoint.contains(first)).toBe(false));
    novuUI.unmount();
  });

  it('offers no navigation, and so no page transition, in the standalone Notifications component', () => {
    const { novuUI, mountPoint } = mount('Notifications');

    expect(mountPoint.querySelector('.nv-preferences__button')).toBeNull();
    expect(page(mountPoint, 'notifications')?.hasAttribute('data-direction')).toBe(false);
    novuUI.unmount();
  });

  it('exposes the open state on the trigger and plays the exit of the menu before removing it', async () => {
    const { novuUI, mountPoint } = mount('InboxContent');
    const trigger = mountPoint.querySelector<HTMLElement>('.nv-inboxStatus__dropdownTrigger');
    expect(trigger?.getAttribute('aria-expanded')).toBe('false');

    click(trigger);
    const menu = mountPoint.querySelector<HTMLElement>('.nv-inboxStatus__dropdownContent');
    expect(trigger?.getAttribute('aria-expanded')).toBe('true');
    expect(trigger?.dataset.open).toBe('true');
    expect(menu?.dataset.state).toBe('open');
    expect(menu?.dataset.side).toBeDefined();

    const exit = stubRunningExitAnimation(menu as HTMLElement);
    click(trigger);
    expect(trigger?.getAttribute('aria-expanded')).toBe('false');
    expect(menu?.dataset.state).toBe('closed');
    expect(isInert(menu)).toBe(true);
    expect(mountPoint.contains(menu)).toBe(true);

    exit.finish();
    await vi.waitFor(() => expect(mountPoint.contains(menu)).toBe(false));
    novuUI.unmount();
  });

  it('closes only the innermost overlay on Escape, even while it is still animating out', () => {
    const { novuUI, mountPoint } = mount('Inbox');
    click(mountPoint.querySelector('.nv-inbox__popoverTrigger'));
    const inbox = mountPoint.querySelector<HTMLElement>('.nv-inbox__popoverContent');
    expect(inbox?.dataset.state).toBe('open');

    click(mountPoint.querySelector('.nv-inboxStatus__dropdownTrigger'));
    const menu = mountPoint.querySelector<HTMLElement>('.nv-inboxStatus__dropdownContent');
    stubRunningExitAnimation(menu as HTMLElement);

    pressEscape();
    expect(menu?.dataset.state).toBe('closed');
    expect(inbox?.dataset.state).toBe('open');

    // The closing menu already left the focus stack, so the next Escape reaches the Inbox.
    pressEscape();
    expect(inbox?.dataset.state).not.toBe('open');
    novuUI.unmount();
  });
});
