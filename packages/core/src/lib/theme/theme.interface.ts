export interface ITheme {
  branding: {
    mainColor?: string;
    logo?: string;
    [key: string]: string;
  };
  emailTemplate: IEmailTemplate;
}

export interface IEmailTemplate {
  getEmailLayout(): string;
  getTemplateVariables(): Record<string, unknown>;
}

