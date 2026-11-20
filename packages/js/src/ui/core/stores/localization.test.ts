import { createRoot, createSignal } from 'solid-js';
import { describe, expect, it } from 'vitest';
import { createLocalizationStore } from './localization';

describe('localization store', () => {
  it('falls back to the defaults and normalises the locale', () => {
    const { store, dispose } = createRoot((dispose) => ({ dispose, store: createLocalizationStore(() => undefined) }));

    expect(store.t('notifications.actions.readAll')).toBe('Mark all as read');
    expect(store.locale()).toBe('en-US');
    dispose();
  });

  it('applies host overrides, including function strings, and follows locale changes', () => {
    const [localization, setLocalization] = createSignal({
      locale: 'pl_PL',
      'notifications.actions.readAll': 'Oznacz wszystkie',
    });
    const { store, dispose } = createRoot((dispose) => ({ dispose, store: createLocalizationStore(localization) }));

    expect(store.t('notifications.actions.readAll')).toBe('Oznacz wszystkie');
    expect(store.locale()).toBe('pl-PL');

    setLocalization({ locale: 'de-DE', 'notifications.actions.readAll': 'Alle lesen' });

    expect(store.t('notifications.actions.readAll')).toBe('Alle lesen');
    expect(store.locale()).toBe('de-DE');
    dispose();
  });
});
