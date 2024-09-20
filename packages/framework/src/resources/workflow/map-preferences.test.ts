import { it, describe, expect } from 'vitest';
import { mapPreferences } from './map-preferences';

describe('mapPreferences', () => {
  it('should return an empty object for undefined input', () => {
    const result = mapPreferences();

    expect(result).to.deep.equal({});
  });

  it('should return an empty object when an empty object is passed', () => {
    const result = mapPreferences({});

    expect(result).to.deep.equal({});
  });

  it('should return the mapped object for a partial object', () => {
    const result = mapPreferences({
      channels: {
        inApp: { enabled: false },
      },
    });

    expect(result).to.deep.equal({
      channels: {
        in_app: { enabled: false },
      },
    });
  });

  it('should return the the mapped equivalent of a full preference object', () => {
    const result = mapPreferences({
      workflow: { enabled: true, readOnly: false },
      channels: {
        email: { enabled: true, readOnly: false },
        sms: { enabled: true, readOnly: false },
        push: { enabled: true, readOnly: false },
        inApp: { enabled: true, readOnly: true },
        chat: { enabled: true, readOnly: false },
      },
    });

    expect(result).to.deep.equal({
      workflow: { enabled: true, readOnly: false },
      channels: {
        email: { enabled: true, readOnly: false },
        sms: { enabled: true, readOnly: false },
        push: { enabled: true, readOnly: false },
        in_app: { enabled: true, readOnly: true },
        chat: { enabled: true, readOnly: false },
      },
    });
  });
});
