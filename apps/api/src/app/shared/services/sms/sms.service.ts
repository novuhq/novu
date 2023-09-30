import * as twilio from 'twilio';

export class SmsService {
  private provider = process.env.NODE_ENV === 'test' ? null : twilio(this.SID, this.AUTH_TOKEN);

  constructor(private AUTH_TOKEN: string, private SID: string) {}

  async sendMessage(to: string, from: string, body: string) {
    if (process.env.NODE_ENV === 'test' || !this.provider) {
      return null;
    }

    return await this.provider.messages.create({
      body,
      to,
      from,
    });
  }
}
