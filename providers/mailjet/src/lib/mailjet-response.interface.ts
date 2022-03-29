// eslint-disable-next-line @typescript-eslint/naming-convention
export interface MailjetResponse {
  response: { header: Header };
  body: Body;
}

// eslint-disable-next-line @typescript-eslint/naming-convention
interface Header {
  date: string;
  ['x-mj-request-guid']: string;
}

// eslint-disable-next-line @typescript-eslint/naming-convention
interface Body {
  Messages: Message[];
}

// eslint-disable-next-line @typescript-eslint/naming-convention
interface Message {
  Status: string;
  CustomID: string;
  To: [
    {
      Email: string;
      MessageUUID: string;
      MessageID: string;
      MessageHref: string;
    }
  ];
  Cc: string[];
  Bcc: string[];
}
