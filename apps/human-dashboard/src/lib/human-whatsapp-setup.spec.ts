import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('./human-api-key', () => ({ requestForAccount: vi.fn() }));

const { toWhatsAppSetupState } = await import('./human-whatsapp-setup');
const { whatsAppRows } = await import('./human-channels-overview');

describe('toWhatsAppSetupState', () => {
  it('hides WhatsApp while it is turned off for the account', () => {
    expect(toWhatsAppSetupState({ enabled: false, available: false, connected: false })).toEqual({ step: 'hidden' });
  });

  it('opens on the Facebook button with the ids the API hands over', () => {
    expect(
      toWhatsAppSetupState({ enabled: true, available: true, appId: 'app-1', configId: 'config-1', connected: false })
    ).toEqual({ step: 'connect', appId: 'app-1', configId: 'config-1' });
  });

  it('cannot connect without the ids, or when the deployment cannot run the flow', () => {
    expect(toWhatsAppSetupState({ enabled: true, available: true, connected: false })).toEqual({
      step: 'unavailable',
    });
    expect(
      toWhatsAppSetupState({ enabled: true, available: false, reason: 'missing_platform_config', connected: false })
    ).toEqual({ step: 'unavailable' });
  });

  it('reads a linked business number as one step short until the operator’s own number is bound', () => {
    expect(
      toWhatsAppSetupState({
        enabled: true,
        available: true,
        appId: 'app-1',
        configId: 'config-1',
        connected: false,
        businessConnected: true,
        displayPhoneNumber: '+1 555',
      })
    ).toEqual({ step: 'verify', displayPhoneNumber: '+1 555', reconnect: { appId: 'app-1', configId: 'config-1' } });
  });

  it('reads WhatsApp as connected once the operator’s own number is bound, whatever else is said', () => {
    expect(
      toWhatsAppSetupState({
        enabled: true,
        available: false,
        connected: true,
        businessConnected: true,
        displayPhoneNumber: '+1 555',
        operatorNumberBound: true,
        operatorPhoneNumber: '+15550100199',
      })
    ).toEqual({ step: 'connected', displayPhoneNumber: '+1 555', operatorPhoneNumber: '+15550100199' });
  });

  it('keeps connecting again possible for a saved number, since Meta’s webhook can have failed after the save', () => {
    expect(
      toWhatsAppSetupState({
        enabled: true,
        available: true,
        appId: 'app-1',
        configId: 'config-1',
        connected: true,
        displayPhoneNumber: '+1 555',
      })
    ).toEqual({
      step: 'connected',
      displayPhoneNumber: '+1 555',
      reconnect: { appId: 'app-1', configId: 'config-1' },
    });
  });
});

describe('whatsAppRows', () => {
  it('has no row while WhatsApp is hidden, or while that could not be read', () => {
    expect(whatsAppRows({ step: 'hidden' })).toEqual([]);
    expect(whatsAppRows({ step: 'unknown' })).toEqual([]);
  });

  it('shows a row to set up while nothing is linked', () => {
    expect(whatsAppRows({ step: 'connect', appId: 'a', configId: 'c' })).toEqual([
      { via: 'whatsapp', name: 'WhatsApp', handles: [], connected: false },
    ]);
  });

  it('shows the business number while the operator still has to send their code, as not connected yet', () => {
    expect(whatsAppRows({ step: 'verify', displayPhoneNumber: '+1 555' })).toEqual([
      {
        via: 'whatsapp',
        name: 'WhatsApp',
        handles: [{ value: '+1 555', label: 'business number' }],
        connected: false,
      },
    ]);
  });

  it('shows the business number once it is linked', () => {
    expect(whatsAppRows({ step: 'connected', displayPhoneNumber: '+1 555' })).toEqual([
      {
        via: 'whatsapp',
        name: 'WhatsApp',
        handles: [{ value: '+1 555', label: 'business number' }],
        connected: true,
      },
    ]);
  });
});
