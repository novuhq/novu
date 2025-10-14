import { EmailProviderIdEnum } from '@novu/shared';
import {
  ChannelTypeEnum,
  CheckIntegrationResponseEnum,
  ICheckIntegrationResponse,
  IEmailOptions,
  IEmailProvider,
  ISendMessageSuccessResponse,
} from '@novu/stateless';
import { BaseProvider, CasingEnum } from '../../../base.provider';
import { WithPassthrough } from '../../../utils/types';
import axios from 'axios';

export class MsGraphEmailProvider extends BaseProvider implements IEmailProvider {
  id = EmailProviderIdEnum.MsGraph;
  protected casing: CasingEnum = CasingEnum.CAMEL_CASE;
  channelType = ChannelTypeEnum.EMAIL as ChannelTypeEnum.EMAIL;

  constructor(private config: {
    clientId: string;
    clientSecret: string;
    tenantId: string;
    from: string;
    senderName: string;
    to?: string; // BWALK CUSTOM CODE
  }) {
    super();
  }

  async sendMessage(
    options: IEmailOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {}
  ): Promise<ISendMessageSuccessResponse> {
    const transformedOptions = this.transform(bridgeProviderData, options).body as unknown as IEmailOptions;
    const mailData = this.createMailData(transformedOptions);

    const info = await this.sendEmailViaMsGraph(mailData);

    return {
      id: info?.messageId,
      date: new Date().toISOString(),
    };
  }

  async checkIntegration(options: IEmailOptions): Promise<ICheckIntegrationResponse> {
    try {
      const mailData = this.createMailData(options);
      await this.sendEmailViaMsGraph(mailData);

      return {
        success: true,
        message: 'Integrated successfully!',
        code: CheckIntegrationResponseEnum.SUCCESS,
      };
    } catch (error) {
      return {
        success: false,
        message: this.safeGetErrorMessage(error),
        code: CheckIntegrationResponseEnum.FAILED,
      };
    }
  }

  private async sendEmailViaMsGraph(emailData: any) {
    try {
      // Get OAuth2 access token
      const accessToken = await this.getAccessToken();

      // Send email via Microsoft Graph API
      const response = await axios.post(
        `https://graph.microsoft.com/v1.0/users/${this.config.from}/sendMail`,
        emailData,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return {
        messageId: response.headers['x-ms-request-id'] || 'msgraph-sent',
      };
    } catch (error) {
      // Create a clean error object without circular references
      const cleanError = new Error(this.safeGetErrorMessage(error));
      throw cleanError;
    }
  }

  private async getAccessToken(): Promise<string> {
    try {
      const tokenUrl = `https://login.microsoftonline.com/${this.config.tenantId}/oauth2/v2.0/token`;
      
      const tokenData = {
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        scope: 'https://graph.microsoft.com/.default',
        grant_type: 'client_credentials',
      };

      const response = await axios.post(tokenUrl, new URLSearchParams(tokenData), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      return response.data.access_token;
    } catch (error) {
      // Create a clean error object without circular references
      const cleanError = new Error(this.safeGetErrorMessage(error));
      throw cleanError;
    }
  }

  private safeGetErrorMessage(error: any): string {
    try {
      // Handle Axios errors specifically
      if (error?.isAxiosError) {
        const status = error.response?.status;
        const statusText = error.response?.statusText;
        const data = error.response?.data;
        const url = error.config?.url;
        const method = error.config?.method;
        
        return `MSGraph API Error: ${status} ${statusText} - ${data?.error?.message || data?.message || error.message} (${method} ${url})`;
      }

      // Handle other errors
      if (error instanceof Error) {
        return error.message;
      }

      // Handle plain objects
      if (typeof error === 'object' && error !== null) {
        return error.message || error.error || 'Unknown MSGraph error';
      }

      // Fallback for primitive values
      return String(error);
    } catch (stringifyError) {
      return 'Error processing MSGraph error message';
    }
  }

  private createMailData(options: IEmailOptions) {
    const sendMailOptions = {
      message: {
        subject: options.subject,
        body: {
          contentType: options.html ? 'HTML' : 'Text',
          content: options.html || options.text,
        },
        toRecipients: this.config.to ? [{
          emailAddress: {
            address: this.config.to,
          },
        }] : (Array.isArray(options.to) ? options.to : [options.to]).map(email => ({
          emailAddress: {
            address: email,
          },
        })).filter((recipient, index, self) =>
          index === self.findIndex((t) => t.emailAddress.address === recipient.emailAddress.address)
        ),
        from: {
          emailAddress: {
            address: options.from || this.config.from,
            name: options.senderName || this.config.senderName,
          },
        },
        replyTo: options.replyTo ? [{
          emailAddress: {
            address: options.replyTo,
          },
        }] : undefined,
        attachments: options.attachments?.map(attachment => ({
          '@odata.type': '#microsoft.graph.fileAttachment',
          name: attachment.name,
          contentType: attachment.mime,
          contentBytes: attachment.file.toString('base64'),
          contentId: attachment.cid,
          isInline: attachment.disposition === 'inline',
        })),
      },
      saveToSentItems: true,
    };

    return sendMailOptions;
  }
}
