import { Exclude } from 'class-transformer';

export interface IApiKey {
  key: string;
  _userId: string;
}

export class ApplicationEntity {
  _id?: string;

  name: string;

  _organizationId: string;

  identifier: string;

  apiKeys: IApiKey[];

  channels?: {
    email?: {
      senderEmail: string;
      senderName: string;
    };

    sms?: {
      twillio: {
        authToken: string;
        accountSid: string;
        phoneNumber: string;
      };
    };
  };

  branding: {
    fontFamily?: string;
    fontColor?: string;
    contentBackground?: string;
    logo: string;
    color: string;
    direction?: 'ltr' | 'rtl';
  };
}
