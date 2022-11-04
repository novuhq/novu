import {
  AuthenticationResult,
  ConfidentialClientApplication,
  Configuration,
} from '@azure/msal-node';
import {
  AuthenticationProvider,
  AuthenticationProviderOptions,
  Client,
} from '@microsoft/microsoft-graph-client';
import {
  ChannelTypeEnum,
  IEmailOptions,
  IEmailProvider,
  ISendMessageSuccessResponse,
  ICheckIntegrationResponse,
  CheckIntegrationResponseEnum,
} from '@novu/stateless';
import { MSGraphConfig } from './msgraph.config';

class MSGraphApiAuthenticationProvider implements AuthenticationProvider {
  private config: Configuration;
  constructor(conf: Configuration) {
    this.config = conf;
  }

  public async getAccessToken(
    options: AuthenticationProviderOptions
  ): Promise<string> {
    const app = new ConfidentialClientApplication(this.config);

    const request = await app.acquireTokenByClientCredential({
      scopes: ['https://graph.microsoft.com/.default'],
    });

    return request.accessToken;
  }
}

export class MSGraphAPIProvider implements IEmailProvider {
  id = 'msgraph';
  channelType = ChannelTypeEnum.EMAIL as ChannelTypeEnum.EMAIL;
  private readonly provider: MSGraphApiAuthenticationProvider;
  private readonly client: Client;
  private readonly clientConfig: MSGraphConfig;

  constructor(private readonly setConfig: MSGraphConfig) {
    this.clientConfig = setConfig;
    this.provider = new MSGraphApiAuthenticationProvider({
      auth: {
        clientId: setConfig.clientId,
        authority: setConfig.authority,
        clientSecret: setConfig.secret,
      },
    });
    this.client = Client.initWithMiddleware({
      authProvider: this.provider,
    });
  }

  async sendMessage({
    html,
    text,
    to,
    from,
    subject,
    attachments,
  }: IEmailOptions): Promise<ISendMessageSuccessResponse> {
    const recipients = Array.isArray(to) ? to : [to];

    const mail = {
      subject,
      toRecipients: recipients.map((recipient) => ({
        emailAddress: {
          address: recipient,
        },
      })),
      from: {
        emailAddress: {
          address: this.clientConfig.fromAddress,
          name: this.clientConfig.fromName,
        },
      },
      body: {
        content: html ?? text,
        contentType: html ? 'html' : 'text',
      },
    };

    const request = await this.client
      .api(`/users/${this.clientConfig.user}/sendMail`)
      .post({ message: mail });

    return {
      id: request.id,
      date: new Date().toISOString(),
    };
  }

  async checkIntegration(
    options: IEmailOptions
  ): Promise<ICheckIntegrationResponse> {
    return {
      success: true,
      message: 'Integrated successfully!',
      code: CheckIntegrationResponseEnum.SUCCESS,
    };
  }
}
