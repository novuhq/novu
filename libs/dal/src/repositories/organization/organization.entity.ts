export class OrganizationEntity {
  _id?: string;

  name: string;

  logo: string;

  branding: {
    fontFamily?: string;
    fontColor?: string;
    contentBackground?: string;
    logo: string;
    color: string;
    direction?: 'ltr' | 'rtl';
  };
}
