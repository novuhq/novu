import {
  ChannelTypeEnum,
  IEmailOptions,
  IEmailProvider,
  ISendMessageSuccessResponse,
} from '@notifire/core';

import mailchimp from "@mailchimp/mailchimp_transactional"

export class MandrillProvider implements IEmailProvider {
  id = 'mandrill';
  channelType = ChannelTypeEnum.EMAIL as ChannelTypeEnum.EMAIL;

  private Transporter:any;

  constructor(
	  private config: {
		  apiKey: string;
		  from: string;
	  }
  ){
		this.Transporter = mailchimp(this.config.apiKey)
  }

  async sendMessage(options: IEmailOptions): Promise<ISendMessageSuccessResponse>{
	  const response1 =  await  this.Transporter.messages.send(
		  {"message": {"from_email": this.config.from, 
			  "subject": options.subject, 
			  "html" : options.html, 
			  "to": [{ "email": options.to, 
				  "type": "to" }]}
  } )
    return {
      id: response1[0]._id,
      date: new Date().toISOString(),
    };
  }



}
