import { EmailProviderIdEnum } from '@novu/shared';
import { describe, expect, it } from 'vitest';
import { NodemailerHandler } from './nodemailer.handler';

describe('NodemailerHandler.buildProvider', () => {
  it('refuses a private SMTP host before constructing the provider', () => {
    const handler = new NodemailerHandler();

    expect(() =>
      handler.buildProvider({
        host: '127.0.0.1',
        port: '587',
      })
    ).toThrow(/not allowed/);
    expect(handler.getProvider()).toBeUndefined();
  });

  it('builds a provider for a public SMTP host', () => {
    const handler = new NodemailerHandler();

    handler.buildProvider({
      host: 'smtp.example.com',
      port: '587',
    });

    expect(handler.getProvider().id).toBe(EmailProviderIdEnum.CustomSMTP);
  });
});
