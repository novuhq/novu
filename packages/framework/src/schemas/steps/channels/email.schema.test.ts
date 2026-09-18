import { describe, expect, it } from 'vitest';
import { validateData } from '../../../validators';
import { emailChannelSchemas } from './email.schema';

describe('email schema', () => {
  describe('output schema', () => {
    it('accepts standard email output without attachments', async () => {
      const result = await validateData(emailChannelSchemas.output, {
        subject: 'Welcome to Novu',
        body: '<h1>Hello World</h1>',
      });

      expect(result.success).toBe(true);
    });

    it('accepts inline attachments with cid and disposition: inline', async () => {
      const result = await validateData(emailChannelSchemas.output, {
        subject: 'Welcome with Logo',
        body: '<img src="cid:logo_cid" />',
        attachments: [
          {
            name: 'logo.png',
            file: Buffer.from('fake_image_data'),
            mime: 'image/png',
            cid: 'logo_cid',
            disposition: 'inline',
          },
        ],
      });

      expect(result.success).toBe(true);
    });

    it('accepts standard file attachments with disposition: attachment', async () => {
      const result = await validateData(emailChannelSchemas.output, {
        subject: 'Your Invoice',
        body: 'Please find invoice attached',
        attachments: [
          {
            name: 'invoice.pdf',
            file: 'JVBERi0xLjQK...',
            mime: 'application/pdf',
            disposition: 'attachment',
          },
        ],
      });

      expect(result.success).toBe(true);
    });

    it('rejects invalid attachment disposition', async () => {
      const result = await validateData(emailChannelSchemas.output, {
        subject: 'Test',
        body: 'Body',
        attachments: [
          {
            file: 'data',
            mime: 'text/plain',
            disposition: 'invalid-disposition',
          },
        ],
      });

      expect(result.success).toBe(false);
    });
  });
});
