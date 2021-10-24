export interface MailjetResponse {
  response: { header: Header };
  body: Body;
}

interface Header {
  date: string;
  ['x-mj-request-guid']: string;
}

interface Body {
  Messages: Message[];
}

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
