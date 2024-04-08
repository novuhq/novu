export enum MimeTypesEnum {
  JPEG = 'jpeg',
  PNG = 'png',
  JPG = 'jpg',
}

export const MIME_TYPES_LOOKUP: Record<MimeTypesEnum, string> = {
  [MimeTypesEnum.JPEG]: 'image/jpeg',
  [MimeTypesEnum.PNG]: 'image/png',
  [MimeTypesEnum.JPG]: 'image/jpeg',
};
