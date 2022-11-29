/**
 * If you import a dependency which does not include its own type definitions,
 * TypeScript will try to find a definition for it by following the `typeRoots`
 * compiler option in tsconfig.json. For this project, we've configured it to
 * fall back to this folder if nothing is found in node_modules/@types.
 *
 * Often, you can install the DefinitelyTyped
 * (https://github.com/DefinitelyTyped/DefinitelyTyped) type definition for the
 * dependency in question. However, if no one has yet contributed definitions
 * for the package, you may want to declare your own. (If you're using the
 * `noImplicitAny` compiler options, you'll be required to declare it.)
 *
 * This is an example type definition which allows import from `module-name`,
 * e.g.:
 * ```ts
 * import something from 'module-name';
 * something();
 * ```
 */

type UnfetchResponse<T = unknown, K = unknown> = {
  ok: boolean;
  status: number;
  json: () => Promise<T | K>;
};

declare module 'mailersend' {
  export default class MailerSend {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    constructor(config: any);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    request(endpoint?: string, options?: Record<string, unknown>): any;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    send<T = unknown, K = ErrorResponse>(
      emailParams: EmailParams
    ): Promise<UnfetchResponse<T, K>>;
  }

  export class EmailParams {
    constructor(config?: Record<string, unknown>);
    from: string;
    fromName?: string;
    to: Recipient | Recipient[];
    cc?: Recipient[];
    bcc?: Recipient[];
    reply_to?: Recipient[];
    attachments?: Attachment[];
    subject: string;
    html: string;
    text: string;
    templateId?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    variables?: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    personalization?: any;
    tags?: string[];
    setFrom(from: string): EmailParams;
    setFromName(fromName: string): EmailParams;
    setRecipients(recipients: Recipient[]): EmailParams;
    setAttachments(attachments: Attachment[]): EmailParams;
    setCc(cc: string): EmailParams;
    setBcc(bcc: string): EmailParams;
    setSubject(subject: string): EmailParams;
    setHtml(html: string): EmailParams;
    setText(text: string): EmailParams;
    setTemplateId(templateId: string): EmailParams;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setVariables(variables: any): EmailParams;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setPersonalization(personalization: any): EmailParams;
    setTags(tags: string[]): EmailParams;
  }

  export class Attachment {
    constructor(content: string | Buffer, filename: string);
    content: string | Buffer;
    filename: string;
  }

  export class Recipient {
    constructor(email: string, name?: string);
    email: string;
    name?: string;
  }
}

export type ErrorResponse = {
  message: string;
  errors: { [key: string]: string[] };
};
