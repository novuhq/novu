import { it, describe, expect } from 'vitest';
import { mapPreferences } from './map-preferences';

describe('mapPreferences', () => {
  it('should return undefined for undefined input', () => {
    const result = mapPreferences();

    expect(result).to.deep.equal(undefined);
  });

  it('should return and empty object when an empty object is passed', () => {
    const result = mapPreferences({});

    expect(result).to.deep.equal({});
  });

  it('should return the mapped object for a partial object', () => {
    const result = mapPreferences({
      channels: {
        inApp: { defaultValue: false },
      },
    });

    expect(result).to.deep.equal({
      channels: {
        in_app: { defaultValue: false },
      },
    });
  });

  it('should return the the mapped equivalent of a full preference object', () => {
    const result = mapPreferences({
      workflow: { defaultValue: true, readOnly: false },
      channels: {
        email: { defaultValue: true, readOnly: false },
        sms: { defaultValue: true, readOnly: false },
        push: { defaultValue: true, readOnly: false },
        inApp: { defaultValue: true, readOnly: true },
        chat: { defaultValue: true, readOnly: false },
      },
    });

    expect(result).to.deep.equal({
      workflow: { defaultValue: true, readOnly: false },
      channels: {
        email: { defaultValue: true, readOnly: false },
        sms: { defaultValue: true, readOnly: false },
        push: { defaultValue: true, readOnly: false },
        in_app: { defaultValue: true, readOnly: true },
        chat: { defaultValue: true, readOnly: false },
      },
    });
  });
});
