import mailchimp from '@mailchimp/mailchimp_transactional';
import { EmailProviderIdEnum } from '@novu/shared';
import {
  ChannelTypeEnum,
  CheckIntegrationResponseEnum,
  EmailEventStatusEnum,
  ICheckIntegrationResponse,
  IEmailEventBody,
  IEmailOptions,
  IEmailProvider,
  ISendMessageSuccessResponse,
  IVerifyCredentialsResponse,
  VerifyCredentialsStatusEnum,
} from '@novu/stateless';
import { BaseProvider, CasingEnum } from '../../../base.provider';
import { WithPassthrough } from '../../../utils/types';
import { classifyHttpStatus, getErrorHttpStatus, verifyCredentialsResponse } from '../../../utils/verify-credentials';
import {
  IMandrilInterface,
  IMandrillSendOptions,
  IMandrillSendResponse,
  IMandrillTemplateSendOptions,
} from './mandril.interface';

export enum MandrillStatusEnum {
  OPENED = 'open',
  SENT = 'send',
  DEFERRED = 'deferral',
  HARD_BOUNCED = 'hard_bounce',
  SOFT_BOUNCED = 'soft_bounce',
  CLICKED = 'click',
  SPAM = 'spam',
  UNSUBSCRIBED = 'unsub',
  REJECTED = 'reject',
  DELIVERED = 'delivered',
}

export const isMandrillTemplateSendOptions = (
  options: IMandrillSendOptions | IMandrillTemplateSendOptions
): options is IMandrillTemplateSendOptions => {
  return 'template_name' in options && 'template_content' in options && Array.isArray(options.template_content);
};

const MANDRILL_PING_REPLY = 'PONG!';

/**
 * Reads the outcome of `users.ping`. The Mailchimp client never throws: on a refusal it resolves with the
 * request error, so anything other than the ping reply is a failure.
 */
export function classifyMandrillPing(result: unknown): VerifyCredentialsStatusEnum {
  if (result === MANDRILL_PING_REPLY) return VerifyCredentialsStatusEnum.VALID;

  const errorName = (result as { response?: { data?: { name?: unknown } } } | undefined)?.response?.data?.name;
  if (errorName === 'Invalid_Key') return VerifyCredentialsStatusEnum.INVALID;

  return classifyHttpStatus(getErrorHttpStatus(result));
}

export class MandrillProvider extends BaseProvider implements IEmailProvider {
  id = EmailProviderIdEnum.Mandrill;
  protected casing = CasingEnum.SNAKE_CASE;
  channelType = ChannelTypeEnum.EMAIL as ChannelTypeEnum.EMAIL;

  private transporter: IMandrilInterface;

  constructor(
    private config: {
      apiKey: string;
      from: string;
      senderName: string;
    }
  ) {
    super();
    this.transporter = mailchimp(this.config.apiKey);
  }

  async sendMessage(
    emailOptions: IEmailOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {}
  ): Promise<ISendMessageSuccessResponse> {
    const mailData = this.createMailData(emailOptions);
    const mandrillSendOption = this.transform<IMandrillSendOptions | IMandrillTemplateSendOptions>(
      bridgeProviderData,
      mailData
    ).body;
    let response: IMandrillSendResponse[];

    if (isMandrillTemplateSendOptions(mandrillSendOption)) {
      response = await this.transporter.messages.sendTemplate(mandrillSendOption);
    } else {
      response = await this.transporter.messages.send(mandrillSendOption);
    }

    return {
      id: response[0]._id,
      date: new Date().toISOString(),
    };
  }

  private createMailData(emailOptions: IEmailOptions) {
    const message = {
      from_email: emailOptions.from || this.config.from,
      from_name: emailOptions.senderName || this.config.senderName,
      subject: emailOptions.subject,
      html: emailOptions.html,
      to: this.mapTo(emailOptions),
      attachments: emailOptions.attachments?.map((attachment) => ({
        content: attachment.file.toString('base64'),
        type: attachment.mime,
        name: attachment?.name,
      })),
      ...(emailOptions.headers && Object.keys(emailOptions.headers).length > 0 && { headers: emailOptions.headers }),
    };

    const { customData } = emailOptions;

    if (customData?.templateId) {
      const templateGlobalMergeVars = customData.variables
        ? Object.keys(customData.variables)
            .map((key) => [key, customData.variables[key]])
            .map(([name, content]) => ({
              name,
              content: String(content),
            }))
        : [];

      return {
        template_name: customData?.templateId,
        template_content: [],
        message: {
          ...message,
          html: undefined,
          global_merge_vars: templateGlobalMergeVars,
        },
      };
    } else {
      return { message };
    }
  }

  private mapTo(emailOptions: IEmailOptions) {
    const ccs = (emailOptions.cc || []).map((item) => ({
      email: item,
      type: 'cc',
    }));

    const bcc = (emailOptions.bcc || []).map((item) => ({
      email: item,
      type: 'bcc',
    }));

    return [
      ...emailOptions.to.map((item) => ({
        email: item,
        type: 'to',
      })),
      ...ccs,
      ...bcc,
    ];
  }

  async verifyCredentials(): Promise<IVerifyCredentialsResponse> {
    try {
      return verifyCredentialsResponse(classifyMandrillPing(await this.transporter.users.ping()));
    } catch {
      return verifyCredentialsResponse(VerifyCredentialsStatusEnum.UNREACHABLE);
    }
  }

  async checkIntegration(): Promise<ICheckIntegrationResponse> {
    try {
      // The client resolves with the request error instead of throwing, so the reply has to be read.
      const status = classifyMandrillPing(await this.transporter.users.ping());

      if (status !== VerifyCredentialsStatusEnum.VALID) {
        return {
          success: false,
          message: 'Mandrill did not accept the API key',
          code:
            status === VerifyCredentialsStatusEnum.INVALID
              ? CheckIntegrationResponseEnum.BAD_CREDENTIALS
              : CheckIntegrationResponseEnum.FAILED,
        };
      }

      return {
        success: true,
        message: 'Integrated successfully!',
        code: CheckIntegrationResponseEnum.SUCCESS,
      };
    } catch (error) {
      return {
        success: false,
        message: error?.message,
        code: CheckIntegrationResponseEnum.FAILED,
      };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: pre-existing; mirrors the untyped provider webhook body contract
  getMessageId(body: any | any[]): string[] {
    if (Array.isArray(body)) {
      return body.map((item) => item._id);
    }

    return [body._id];
  }

  // biome-ignore lint/suspicious/noExplicitAny: pre-existing; mirrors the untyped provider webhook body contract
  parseEventBody(body: any | any[], identifier: string): IEmailEventBody | undefined {
    if (Array.isArray(body)) {
      body = body.find((item) => item._id === identifier);
    }

    if (!body) {
      return undefined;
    }

    const status = this.getStatus(body.event);

    if (status === undefined) {
      return undefined;
    }

    return {
      status,
      date: new Date().toISOString(),
      externalId: body._id,
      attempts: body.attempt ? parseInt(body.attempt, 10) : 1,
      response: body.response ? body.response : '',
      row: body,
    };
  }

  private getStatus(event: string): EmailEventStatusEnum | undefined {
    switch (event) {
      case MandrillStatusEnum.OPENED:
        return EmailEventStatusEnum.OPENED;
      case MandrillStatusEnum.HARD_BOUNCED:
        return EmailEventStatusEnum.BOUNCED;
      case MandrillStatusEnum.CLICKED:
        return EmailEventStatusEnum.CLICKED;
      case MandrillStatusEnum.SENT:
        return EmailEventStatusEnum.SENT;
      case MandrillStatusEnum.SPAM:
        return EmailEventStatusEnum.SPAM;
      case MandrillStatusEnum.REJECTED:
        return EmailEventStatusEnum.REJECTED;
      case MandrillStatusEnum.SOFT_BOUNCED:
        return EmailEventStatusEnum.BOUNCED;
      case MandrillStatusEnum.UNSUBSCRIBED:
        return EmailEventStatusEnum.UNSUBSCRIBED;
      case MandrillStatusEnum.DEFERRED:
        return EmailEventStatusEnum.DEFERRED;
      case MandrillStatusEnum.DELIVERED:
        return EmailEventStatusEnum.DELIVERED;
      default:
        return undefined;
    }
  }
}
