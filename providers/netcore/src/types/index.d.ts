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
declare module 'netcore' {
  export interface IRecipient {
    name?: string;
    email: string;
  }

  export interface IContent {
    type: 'html' | 'amp';
    value: string;
  }

  export interface IAttachment {
    name: string;
    content: string;
  }

  export interface IPersonalizations {
    attributes?: Record<string, string>;
    to?: IRecipient[];
    cc?: Pick<IRecipient, 'email'>[];
    bcc?: Pick<IRecipient, 'email'>[];
    token_to?: string;
    token_cc?: string;
    attachments?: IAttachment[];
    headers?: Record<string, unknown>;
  }

  export interface ISettings {
    open_track?: boolean;
    click_track?: boolean;
    unsubscribe_track?: boolean;
    ip_pool?: string;
  }

  export interface IEmailBody {
    from: IRecipient;
    reply_to?: string;
    subject: string;
    template_id?: number;
    tags?: string[];
    content: IContent[];
    attachments?: IAttachment[];
    personalizations?: IPersonalizations[];
    settings?: ISettings;
    bcc?: Pick<IRecipient, 'email'>[];
    schedule?: number;
  }

  export interface IEmailResponse {
    data: {
      message_id: string;
    };
    message: string;
    status: string;
  }
}
