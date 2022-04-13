export interface IEnvironment {
  _id?: string;
  name: string;
  _organizationId: string;
  identifier: string;
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

  branding?: {
    color: string;
    logo: string;
    fontColor: string;
    fontFamily: string;
    contentBackground: string;
    direction: 'ltr' | 'rtl';
  };
}
