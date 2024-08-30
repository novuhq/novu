import { it, describe, expect } from 'vitest';
import { buildPreferences } from './build-preferences';

describe('build preferences function', () => {
  it('should build a default preferences object', () => {
    const result = buildPreferences();

    expect(result).to.deep.equal({
      workflow: { defaultValue: true, readOnly: false },
      channels: {
        email: { defaultValue: true, readOnly: false },
        sms: { defaultValue: true, readOnly: false },
        push: { defaultValue: true, readOnly: false },
        in_app: { defaultValue: true, readOnly: false },
        chat: { defaultValue: true, readOnly: false },
      },
    });
  });

  it('should build a default preferences object for a channel', () => {
    const result = buildPreferences({
      workflow: { defaultValue: true, readOnly: false },
      channels: {
        sms: { defaultValue: true, readOnly: false },
        push: { defaultValue: true, readOnly: false },
        in_app: { defaultValue: true, readOnly: true },
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

  it('should build a default preferences object for a workflow', () => {
    const result = buildPreferences({
      channels: {
        sms: { defaultValue: true, readOnly: false },
        push: { defaultValue: true, readOnly: false },
        in_app: { defaultValue: true, readOnly: true },
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

  describe('should build pick up each channel', () => {
    it('should build pick up in_app', () => {
      const result = buildPreferences({
        channels: {
          in_app: { defaultValue: true, readOnly: true },
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

    it('should build pick up email', () => {
      const result = buildPreferences({
        channels: {
          email: { defaultValue: true, readOnly: true },
        },
      });

      expect(result).to.deep.equal({
        workflow: { defaultValue: true, readOnly: false },
        channels: {
          email: { defaultValue: true, readOnly: true },
          sms: { defaultValue: true, readOnly: false },
          push: { defaultValue: true, readOnly: false },
          in_app: { defaultValue: true, readOnly: false },
          chat: { defaultValue: true, readOnly: false },
        },
      });
    });

    it('should build pick up sms', () => {
      const result = buildPreferences({
        channels: {
          sms: { defaultValue: true, readOnly: true },
        },
      });

      expect(result).to.deep.equal({
        workflow: { defaultValue: true, readOnly: false },
        channels: {
          email: { defaultValue: true, readOnly: false },
          sms: { defaultValue: true, readOnly: true },
          push: { defaultValue: true, readOnly: false },
          in_app: { defaultValue: true, readOnly: false },
          chat: { defaultValue: true, readOnly: false },
        },
      });
    });

    it('should build pick up push', () => {
      const result = buildPreferences({
        channels: {
          push: { defaultValue: true, readOnly: true },
        },
      });

      expect(result).to.deep.equal({
        workflow: { defaultValue: true, readOnly: false },
        channels: {
          email: { defaultValue: true, readOnly: false },
          sms: { defaultValue: true, readOnly: false },
          push: { defaultValue: true, readOnly: true },
          in_app: { defaultValue: true, readOnly: false },
          chat: { defaultValue: true, readOnly: false },
        },
      });
    });

    it('should build pick up chat', () => {
      const result = buildPreferences({
        channels: {
          chat: { defaultValue: true, readOnly: true },
        },
      });

      expect(result).to.deep.equal({
        workflow: { defaultValue: true, readOnly: false },
        channels: {
          email: { defaultValue: true, readOnly: false },
          sms: { defaultValue: true, readOnly: false },
          push: { defaultValue: true, readOnly: false },
          in_app: { defaultValue: true, readOnly: false },
          chat: { defaultValue: true, readOnly: true },
        },
      });
    });
  });

  it('should build pick up workflow', () => {
    const result = buildPreferences({
      workflow: { defaultValue: true, readOnly: true },
    });

    expect(result).to.deep.equal({
      workflow: { defaultValue: true, readOnly: true },
      channels: {
        email: { defaultValue: true, readOnly: false },
        sms: { defaultValue: true, readOnly: false },
        push: { defaultValue: true, readOnly: false },
        in_app: { defaultValue: true, readOnly: false },
        chat: { defaultValue: true, readOnly: false },
      },
    });
  });
});
