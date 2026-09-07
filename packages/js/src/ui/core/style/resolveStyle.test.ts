import { describe, expect, it } from 'vitest';
import { resolveStyle } from './resolveStyle';

describe('resolveStyle', () => {
  it('marks every matching appearance key, keeps the base classes, and appends the host overrides', () => {
    const className = resolveStyle(
      { key: 'notificationSubject__strong', className: 'nt-font-semibold' },
      {
        elements: { strong: 'text-red-500', notificationSubject__strong: 'text-blue-500' },
        appearanceKeyToCssInJsClass: {},
      }
    );

    expect(className).toContain('nv-notificationSubject__strong');
    expect(className).toContain('nv-strong');
    expect(className).toContain('nt-font-semibold');
    // the more specific key wins the tailwind-merge conflict
    expect(className).toContain('text-blue-500');
    expect(className).not.toContain('text-red-500');
  });

  it('appends the generated css-in-js class of a key on the client only', () => {
    const source = { elements: {}, appearanceKeyToCssInJsClass: { notificationDot: 'novu-css-abc' } };

    expect(resolveStyle({ key: 'notificationDot' }, source)).toContain('novu-css-abc');
    expect(resolveStyle({ key: 'notificationDot' }, { ...source, isServer: true })).not.toContain('novu-css-abc');
  });

  it('calls an appearance callback with the context', () => {
    const className = resolveStyle(
      { key: 'notification', context: { notification: { isRead: true } } },
      {
        elements: {
          notification: ({ notification }: { notification: { isRead: boolean } }) =>
            notification.isRead ? 'opacity-50' : '',
        },
        appearanceKeyToCssInJsClass: {},
      }
    );

    expect(className).toContain('opacity-50');
  });

  it('adds the icon marker for icon keys', () => {
    expect(
      resolveStyle(
        { key: 'notificationDeliveredAt__icon', iconKey: 'clock' },
        { elements: {}, appearanceKeyToCssInJsClass: {} }
      )
    ).toContain('nv-clock');
  });
});
