import { mount, tick, unmount } from 'svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Inbox from '../src/lib/Inbox.svelte';

const mocks = vi.hoisted(() => ({
  novu: [] as Array<{ options: unknown; socket: { disconnect: ReturnType<typeof vi.fn> } }>,
  ui: [] as Array<{
    mountComponent: ReturnType<typeof vi.fn>;
    unmountComponent: ReturnType<typeof vi.fn>;
    unmount: ReturnType<typeof vi.fn>;
  }>,
}));

vi.mock('@novu/js', () => ({
  Novu: class {
    options: unknown;
    socket = { disconnect: vi.fn().mockResolvedValue({}) };

    constructor(options: unknown) {
      this.options = options;
      mocks.novu.push(this);
    }
  },
}));

vi.mock('@novu/js/ui', () => ({
  NovuUI: class {
    mountComponent = vi.fn();
    unmountComponent = vi.fn();
    unmount = vi.fn();

    constructor() {
      mocks.ui.push(this);
    }

    updateAppearance() {}
    updateLocalization() {}
    updateTabs() {}
    updatePreferencesFilter() {}
    updatePreferenceGroups() {}
    updatePreferencesSort() {}
    updateRouterPush() {}
    updateNovu() {}
    updateOptions() {}
  },
}));

describe('Inbox', () => {
  beforeEach(() => {
    mocks.novu.length = 0;
    mocks.ui.length = 0;
  });

  it('mounts the Inbox renderer once and cleans it up', async () => {
    const target = document.createElement('div');
    document.body.appendChild(target);

    const component = mount(Inbox, {
      target,
      props: {
        applicationIdentifier: 'app-identifier',
        subscriber: 'subscriber-id',
      },
    });
    await vi.dynamicImportSettled();
    await tick();

    const element = target.firstElementChild;
    const ui = mocks.ui[0];
    expect(mocks.novu).toHaveLength(1);
    expect(mocks.ui).toHaveLength(1);
    expect(element).toBeInstanceOf(HTMLDivElement);
    expect(ui?.mountComponent).toHaveBeenCalledTimes(1);
    expect(ui?.mountComponent).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Inbox',
        element,
      })
    );

    await unmount(component);

    expect(ui?.unmountComponent).toHaveBeenCalledWith(element);
    expect(ui?.unmount).toHaveBeenCalledTimes(1);
    expect(mocks.novu[0]?.socket.disconnect).toHaveBeenCalledTimes(1);
    target.remove();
  });
});
