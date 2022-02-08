export interface ITelnyxCLient {
    messages: {
      create: (options: ITelnyxSmsOptions) => Promise<ITelnyxMessageResponse>;
    };
};
  

export interface ITelnyxSmsOptions {
    to: string;
    text: string;
    from?: string;
    messaging_profile_id?: string;
}



interface From {
  phone_number: string;
  carrier: string;
  line_type: string;
}

interface To {
  phone_number: string;
  status: string;
  carrier: string;
  line_type: string;
}

interface Data {
  record_type: string;
  direction: string;
  id: string;
  type: string;
  organization_id: string;
  messaging_profile_id: string;
  from: From;
  to: To[];
  text: string;
  media: any[];
  webhook_url: string;
  webhook_failover_url: string;
  encoding: string;
  parts: number;
  tags: any[];
  cost?: any;
  received_at: Date;
  sent_at?: any;
  completed_at?: any;
  valid_until: Date;
  errors: any[];
}

export interface ITelnyxMessageResponse {
  data: Data;
}

