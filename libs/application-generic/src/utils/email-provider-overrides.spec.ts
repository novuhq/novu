import {
  omitNovuSenderFieldsFromEmailProviderPassthrough,
  resolveNovuEmailSenderFields,
} from './email-provider-overrides';

describe('email-provider-overrides', () => {
  describe('resolveNovuEmailSenderFields', () => {
    it('should resolve string from and senderName', () => {
      const result = resolveNovuEmailSenderFields({
        from: 'sender@example.com',
        senderName: 'Acme Inc',
      });

      expect(result).toEqual({
        from: 'sender@example.com',
        senderName: 'Acme Inc',
      });
    });

    it('should resolve sendgrid-style from object', () => {
      const result = resolveNovuEmailSenderFields({
        from: {
          email: 'sender@example.com',
          name: 'From Object Name',
        },
      });

      expect(result).toEqual({
        from: 'sender@example.com',
        senderName: 'From Object Name',
      });
    });

    it('should prefer override senderName over from object name', () => {
      const result = resolveNovuEmailSenderFields({
        from: {
          email: 'sender@example.com',
          name: 'From Object Name',
        },
        senderName: 'Override Name',
      });

      expect(result).toEqual({
        from: 'sender@example.com',
        senderName: 'Override Name',
      });
    });

    it('should resolve nodemailer-style from object', () => {
      const result = resolveNovuEmailSenderFields({
        from: {
          address: 'sender@example.com',
          name: 'SMTP Sender',
        },
      });

      expect(result).toEqual({
        from: 'sender@example.com',
        senderName: 'SMTP Sender',
      });
    });
  });

  describe('omitNovuSenderFieldsFromEmailProviderPassthrough', () => {
    it('should remove senderName and string from', () => {
      const result = omitNovuSenderFieldsFromEmailProviderPassthrough({
        from: 'sender@example.com',
        senderName: 'Acme Inc',
        cc: ['cc@example.com'],
      });

      expect(result).toEqual({
        cc: ['cc@example.com'],
      });
    });

    it('should keep provider-native from object', () => {
      const from = { email: 'sender@example.com', name: 'Acme Inc' };
      const result = omitNovuSenderFieldsFromEmailProviderPassthrough({
        from,
        senderName: 'ignored',
        templateId: 'd-123',
      });

      expect(result).toEqual({
        from,
        templateId: 'd-123',
      });
    });
  });
});
