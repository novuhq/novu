/* @vitest-environment node */

import { render } from 'svelte/server';
import { describe, expect, it, vi } from 'vitest';
import Inbox from '../src/lib/Inbox.svelte';

vi.mock('@novu/js/ui', () => {
  throw new Error('@novu/js/ui must not be evaluated during SSR');
});

describe('Inbox SSR', () => {
  it('renders the host without loading browser-only UI code', () => {
    const { body } = render(Inbox, {
      props: {
        applicationIdentifier: 'app-identifier',
        subscriber: 'subscriber-id',
      },
    });

    expect(body).toContain('<div></div>');
  });
});
