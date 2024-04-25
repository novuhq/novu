import { MimeTypesEnum } from '@novu/shared';
import { OrgColorType, UpdateOrgBrandingPayloadType } from '../../../../api/organization';

export const DEFAULT_BRANDING_COLOR: OrgColorType = '#f47373';
export const DEFAULT_FONT_COLOR: OrgColorType = DEFAULT_BRANDING_COLOR;
export const DEFAULT_FONT_FAMILY = 'inherit';
export const BRAND_LOGO_SIZE = '6.25rem';

export const FONT_FAMILIES = [
  DEFAULT_FONT_FAMILY,
  'Fira Code',
  'Roboto',
  'Montserrat',
  'Open Sans',
  'Lato',
  'Nunito',
  'Oswald',
  'Raleway',
];

export interface IBrandFormValues extends UpdateOrgBrandingPayloadType {
  file: File | null;
}

export const ACCEPTABLE_ORG_IMAGE_TYPES = [MimeTypesEnum.JPEG, MimeTypesEnum.PNG, MimeTypesEnum.JPG];
