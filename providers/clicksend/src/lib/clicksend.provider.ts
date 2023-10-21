import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  ISmsOptions,
  ISmsProvider,
} from '@novu/stateless';
import axios from 'axios';



export class ClicksendSmsProvider implements ISmsProvider {
  id = 'clicksend';
  channelType = ChannelTypeEnum.SMS as ChannelTypeEnum.SMS;

  private axiosInstance: any;


  constructor(
    private config: {
      username: string;
      apiKey: string;
    }
  ) {
   
    this.axiosInstance = axios.create({
      baseURL: "https://rest.clicksend.com/v3",
      headers: {
        username: config.username,
        password: config.apiKey
      }
    })
  }

  async sendMessage(
    options: ISmsOptions
  ): Promise<ISendMessageSuccessResponse> {

    const smsOptions = {
      source: "sdk",
      to: options.to,
      body: options.content
    }

    const res = await this.axiosInstance.post("/sms/send", { messages: [smsOptions] });

    return {
      id: res.response.data.data.messages[0].message_id,
      date: res.response.data.data.messages[0].date,
    };
  }
}
