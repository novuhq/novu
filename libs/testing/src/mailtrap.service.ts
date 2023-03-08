import { setTimeout } from 'timers/promises';
import axios, { AxiosInstance } from 'axios';

type EmailAddress = string;
type IpAddress = string;
export type MailtrapAccountId = number;
export type MailtrapApiKey = string;
export type MailtrapAttachmentId = number;
export type MailtrapInboxId = number;
type MailtrapMailId = number;
type MailtrapToken = string;
type MessageId = string; // UUID shape

const SANDBOX_API_HOSTNAME = 'https://sandbox.api.mailtrap.io';
const TESTING_API_HOSTNAME = 'https://mailtrap.io';
const BASE_PATH = '/api';

export enum MailtrapInboxStatusEnum {
  ACTIVE = 'active',
  INACTIVE = 'inactive', // ???
}

interface IFrom {
  email: EmailAddress;
  name: string;
}

interface IRecipient {
  email: EmailAddress;
  name?: string;
}

interface IEmailWithText {
  from: IFrom;
  to: IRecipient[];
  cc?: IRecipient[];
  bcc?: IRecipient[];
  subject: string;
  text: string; // Body
}

interface ISendEmailResponseDto {
  success: boolean;
  message_ids: MessageId[];
}

interface IMailtrapInbox {
  id: MailtrapInboxId;
  name: string;
  status: MailtrapInboxStatusEnum;
  email_username: string;
  emails_count: number;
  emails_unread_count: number;
}

interface ISmtpInformation {
  ok: boolean;
  data: {
    mail_from_addr: EmailAddress;
    rcpt_to_addrs: EmailAddress[];
    client_ip: IpAddress;
  };
}

interface IMailtrapAttachment {
  id: MailtrapAttachmentId;
  messageId: MailtrapMailId;
  filename: string;
  attachment_type: string;
  content_type: string;
  content_id?: number;
  transfer_encoding?: string;
  attachment_size: number;
  created_at: string;
  updated_at: string;
  download_path: string;
}

interface IMailtrapMail {
  id: MailtrapMailId;
  inboxId: MailtrapInboxId;
  subject: string;
  sent_at: string; // Date time ISO
  from_email: string;
  from_name: string;
  to_email: string;
  to_name: string;
  is_read: boolean;
  created_at: string;
  updated_at: string;
  html_path: string;
  txt_path: string;
  raw_path: string;
  download_path: string;
  html_source_path: string;
  smtp_information: ISmtpInformation;
}

export class MailtrapService {
  private httpClient: AxiosInstance;

  constructor(private apiKey: MailtrapApiKey) {
    this.httpClient = axios.create();
  }

  private buildSandboxApiUrl(path: string): string {
    return `${SANDBOX_API_HOSTNAME}${path}`;
  }

  private buildTestingApiUrl(path: string): string {
    return `${TESTING_API_HOSTNAME}${path}`;
  }

  private async getCall<T>(url: string): Promise<{ data: T }> {
    return await this.httpClient.get(url, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
    });
  }

  private async patchCall<T>(url: string): Promise<{ data: T }> {
    return await this.httpClient.patch(
      url,
      {},
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
      }
    );
  }

  private async postCall<P, T>(url: string, data: P): Promise<{ data: T }> {
    return await this.httpClient.post(url, data, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
    });
  }

  async cleanInbox(accountId: MailtrapAccountId, inboxId: MailtrapInboxId): Promise<IMailtrapInbox> {
    const url = this.buildTestingApiUrl(`${BASE_PATH}/accounts/${accountId}/inboxes/${inboxId}/clean`);

    const response = await this.patchCall<IMailtrapInbox>(url);
    const { data } = response;

    return data;
  }

  async getInboxes(accountId: MailtrapAccountId): Promise<IMailtrapInbox[]> {
    const url = this.buildTestingApiUrl(`${BASE_PATH}/accounts/${accountId}/inboxes`);

    const response = await this.getCall<IMailtrapInbox[]>(url);
    const { data } = response;

    return data;
  }

  async getInboxMessages(accountId: MailtrapAccountId, inboxId: MailtrapInboxId): Promise<IMailtrapMail[]> {
    const url = this.buildTestingApiUrl(`${BASE_PATH}/accounts/${accountId}/inboxes/${inboxId}/messages`);

    const response = await this.getCall<IMailtrapMail[]>(url);
    const { data } = response;

    return data;
  }

  /**
   *
   * Use Mailtrap.io to send an email to the selected inbox through their Sandbox
   * It doesn't send a real email. So don't panic. :)
   * Is in Beta so expect changes.
   *
   * https://api-docs.mailtrap.io/docs/mailtrap-api-docs/bcf61cdc1547e-send-email-early-access
   */
  async sendEmail(inboxId: MailtrapInboxId, payload: IEmailWithText): Promise<ISendEmailResponseDto> {
    const url = this.buildSandboxApiUrl(`${BASE_PATH}/send/${inboxId}`);

    const response = await this.postCall<IEmailWithText, ISendEmailResponseDto>(url, payload);
    const { data } = response;

    return data;
  }

  /**
   * Due the async nature of sending an email and being processed we use this poller to try to
   * know when the email has arrived.
   */
  async pollInbox(accountId: MailtrapAccountId, inboxId: MailtrapInboxId): Promise<IMailtrapMail[]> {
    let tries = 10;
    while (tries > 0) {
      console.info(`Number of tries left: ${tries}`);
      const inboxMessages = await this.getInboxMessages(accountId, inboxId);

      if (inboxMessages.length === 0) {
        tries--;
        await setTimeout(1000);
      } else {
        return inboxMessages;
      }
    }

    return [];
  }

  async getAttachment(
    accountId: MailtrapAccountId,
    inboxId: MailtrapInboxId,
    messageId: MailtrapMailId
  ): Promise<IMailtrapAttachment[]> {
    const url = this.buildTestingApiUrl(
      `${BASE_PATH}/accounts/${accountId}/inboxes/${inboxId}/messages/${messageId}/attachments`
    );

    try {
      const response = await this.getCall<IMailtrapAttachment[]>(url);
      const { data } = response;

      return data;
    } catch (error) {
      return [];
    }
  }

  async getMessageByPath(path: string): Promise<string | undefined> {
    try {
      const url = this.buildTestingApiUrl(path);

      const response = await this.getCall<string>(url);
      const { data } = response;

      return data;
    } catch (error) {
      return undefined;
    }
  }
}
