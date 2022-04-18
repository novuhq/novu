export interface ITheme {
  branding: {
    mainColor?: string;
    logo?: string;
    [key: string]: string | undefined | null;
  };
  emailTemplate: IEmailTemplate;
}

export interface IEmailTemplate {
  getEmailLayout(): string;
  getTemplateVariables(): Record<string, unknown>;
}
