import { MimeTypesEnum } from '@novu/shared';
import { UpdateOrgBrandingPayloadType } from '../../../../api/organization';

export const DEFAULT_BRANDING_COLOR = '#f47373';
export const DEFAULT_FONT_FAMILY = 'inherit';

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
