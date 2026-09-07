import { Logger } from '@nestjs/common';
import { PlainClient, UpsertResult } from '@team-plain/typescript-sdk';

const LOG_CONTEXT = 'SupportService';

export class SupportService {
  private plainClient: PlainClient;
  private readonly plainKey: string;
  constructor() {
    this.plainKey = process.env.PLAIN_SUPPORT_KEY;
    if (this.plainKey) {
      this.plainClient = new PlainClient({ apiKey: this.plainKey });
      Logger.log(`Initialized PlainClient`, LOG_CONTEXT);
    } else {
      Logger.log('Skipping PlainClient initialization', LOG_CONTEXT);
    }
  }

  async upsertCustomer({ emailAddress, fullName, novuUserId }) {
    const res = await this.plainClient?.upsertCustomer({
      identifier: {
        emailAddress,
      },
      onCreate: {
        email: {
          email: emailAddress,
          isVerified: true,
        },
        externalId: novuUserId,
        fullName,
      },
      onUpdate: {
        externalId: { value: novuUserId },
        email: {
          email: emailAddress,
          isVerified: true,
        },
        fullName: {
          value: fullName,
        },
      },
    });
    if (res.error) {
      Logger.error({ emailAddress, fullName, error: res.error }, res.error.message, LOG_CONTEXT);
      throw new Error(res.error.message);
    } else {
      return res;
    }
  }

  async createThread({ plainCustomerId, threadText }) {
    const res = await this.plainClient?.createThread({
      customerIdentifier: {
        customerId: plainCustomerId,
      },
      components: [
        {
          componentText: {
            text: threadText,
          },
        },
      ],
    });

    if (res.error) {
      Logger.error({ plainCustomerId, threadText, error: res.error }, res.error.message, LOG_CONTEXT);
      throw new Error(res.error.message);
    } else {
      return res;
    }
  }
}
