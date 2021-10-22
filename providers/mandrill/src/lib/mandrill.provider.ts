import {
  ChannelTypeEnum,
  IEmailOptions,
  IEmailProvider,
  ISendMessageSuccessResponse,
} from '@notifire/core';

import nodemailer,{Transporter} from "nodemailer";

import mandrillTransport from "mandrill-nodemailer-transport";

export class MandrillProvider implements IEmailProvider {
  id = 'mandrill';
  channelType = ChannelTypeEnum.EMAIL as ChannelTypeEnum.EMAIL;

  private transporter:Transporter;

  constructor(
	  private config: {
		  apiKey: string;
		  from: string;
	  }
  ){
	 	this.transporter = nodemailer.createTransport(new mandrillTransport({
			apiKey: this.config.apiKey
	}));
  }

  async sendMessage(options: IEmailOptions): Promise<ISendMessageSuccessResponse>{
	  this.transporter.sendMail({
		  from: this.config.from || options.from,
		  to: options.to,
		  subject: options.subject,
		  html: options.html
	  },(err,info) => {
		  if(err){
			  return {
				  id: err.message,
				  date: new Date().toISOString()
			  }
		  }
		  else
			  {
					return {
						id: info.messageId,
						date: new Date().toISOString()
					}
			  }
	  })
  }



}
