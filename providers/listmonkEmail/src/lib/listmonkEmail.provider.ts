import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  IEmailOptions,
  IEmailProvider,
  ICheckIntegrationResponse,
  CheckIntegrationResponseEnum,
} from '@novu/stateless';
import axios, { AxiosResponse } from 'axios';
import { IListmonkMailData } from '../types/listmonk-mail-data.type';

export class ListmonkEmailProvider implements IEmailProvider {
  id = 'listmonkEmail';
  apiBaseUrl: string;
  channelType = ChannelTypeEnum.EMAIL as ChannelTypeEnum.EMAIL;

  constructor(
    private config: {
      host: string;
      port: string;
      username: string;
      password: string;
      templateId: number;
    }
  ) {
    this.apiBaseUrl = `http://${config.host}:${config.port}/api`;
  }

  async checkIntegration(
    options: IEmailOptions
  ): Promise<ICheckIntegrationResponse> {
    try {
      const url = this.apiBaseUrl + '/tx';
      const mailData = this.createMailData(options);

      await this.sendMessageToListmonk(url, mailData);

      return {
        success: true,
        message: 'Integration Successful',
        code: CheckIntegrationResponseEnum.SUCCESS,
      };
    } catch (err) {
      return {
        success: false,
        message: err.response?.data?.message,
        code: this.mapResponse(err.response?.status),
      };
    }
  }

  async sendMessage(
    options: IEmailOptions
  ): Promise<ISendMessageSuccessResponse> {
    const url = this.apiBaseUrl + '/tx';
    const mailData = this.createMailData(options);

    await this.sendMessageToListmonk(url, mailData);

    return {
      id: options.id,
      date: new Date().toDateString(),
    };
  }

  private async sendMessageToListmonk(url, mailData: IListmonkMailData) {
    let count = 0;
    let done = false;

    while (!done) {
      try {
        await axios.post(url, mailData, {
          auth: {
            username: this.config.username,
            password: this.config.password,
          },
        });

        done = true;
      } catch (err) {
        if (
          err.response?.status === 400 &&
          err.response?.data?.message === 'Subscriber not found'
        ) {
          if (count !== 0) {
            throw err;
          }

          await this.subscribeToListmonk(mailData);
          ++count;
        } else {
          throw err;
        }
      }
    }
  }

  private createMailData(options: IEmailOptions): IListmonkMailData {
    const mailData: IListmonkMailData = {
      template_id: this.config.templateId,
      subscriber_email: Array.isArray(options.to) ? options.to[0] : options.to,
    };

    if (options.from) {
      mailData.from_email = options.from;
    }

    return mailData;
  }

  private async subscribeToListmonk(mailData: IListmonkMailData) {
    const url = this.apiBaseUrl + '/subscribers';
    const name = mailData.subscriber_email.split('@')[0];

    await axios.post(
      url,
      {
        name,
        status: 'enabled',
        email: mailData.subscriber_email,
      },
      {
        auth: {
          username: this.config.username,
          password: this.config.password,
        },
      }
    );
  }

  private mapResponse(statusCode: number) {
    switch (statusCode) {
      case 400:
        return CheckIntegrationResponseEnum.INVALID_EMAIL;
      case 401:
      case 403:
        return CheckIntegrationResponseEnum.BAD_CREDENTIALS;
      default:
        return CheckIntegrationResponseEnum.FAILED;
    }
  }
}
