export interface IApplication {
  _id?: string;
  name: string;
  _organizationId: string;
  identifier: string;

  branding?: {
    color: string;
    logo: string;
    fontColor: string;
    fontFamily: string;
    contentBackground: string;
    direction: 'ltr' | 'rtl';
  };
}
