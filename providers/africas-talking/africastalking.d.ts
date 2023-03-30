declare module 'africastalking' {
  export interface ISMSRecipient {
    statusCode: number;
    number: string;
    cost: string;
    status: 'Success' | 'Error';
    messageId: string;
  }

  export interface ISMSSendResponse {
    SMSMessageData: {
      Message: string;
      Recipients: SMSRecipient[];
    };
  }

  export interface ISMS {
    send(options: SMSOptions): Promise<SMSSendResponse>;
  }

  export interface IAfricasTalkingClient {
    SMS: SMS;
  }

  export interface ISMSOptions {
    to: string;
    message: string;
    from?: string;
  }

  export interface IAfricasTalkingClientOptions {
    apiKey: string;
    username: string;
    // Alphanumeric or numeric short code used as the default from for all outgoing messages
    from?: string;
  }

  declare function africasTalking(
    options: AfricasTalkingClientOptions
  ): AfricasTalkingClient;

  export default africasTalking;
}
