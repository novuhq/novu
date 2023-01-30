import {
  IEmailOptions,
  ISendMessageSuccessResponse,
  ICheckIntegrationResponse,
  CheckIntegrationResponseEnum,
} from '@novu/stateless';

import { SendgridEmailProvider } from '@novu/sendgrid';

export class NovuEmailProvider extends SendgridEmailProvider {
  async sendMessage(
    options: IEmailOptions
  ): Promise<ISendMessageSuccessResponse> {
    delete options.from;

    return super.sendMessage(options);
  }
  async checkIntegration(
    options: IEmailOptions
  ): Promise<ICheckIntegrationResponse> {
    return this.config.apiKey
      ? {
          success: true,
          message: 'Integration Successful',
          code: CheckIntegrationResponseEnum.SUCCESS,
        }
      : {
          success: false,
          message: 'NOVU_EMAIL_INTEGRATION_API_KEY missing',
          code: CheckIntegrationResponseEnum.BAD_CREDENTIALS,
        };
  }
}
