export enum FileExtensionEnum {
  JPEG = 'jpeg',
  PNG = 'png',
  JPG = 'jpg',
  GIF = 'gif',
  WEBP = 'webp',
}

export enum MimeTypesEnum {
  JPEG = 'image/jpeg',
  PNG = 'image/png',
  JPG = 'image/jpg',
  GIF = 'image/gif',
  WEBP = 'image/webp',
}

export const FILE_EXTENSION_TO_MIME_TYPE: Record<FileExtensionEnum, MimeTypesEnum> = {
  [FileExtensionEnum.JPEG]: MimeTypesEnum.JPEG,
  [FileExtensionEnum.PNG]: MimeTypesEnum.PNG,
  [FileExtensionEnum.JPG]: MimeTypesEnum.JPG,
  [FileExtensionEnum.GIF]: MimeTypesEnum.GIF,
  [FileExtensionEnum.WEBP]: MimeTypesEnum.WEBP,
};

export const MIME_TYPE_TO_FILE_EXTENSION: Record<MimeTypesEnum, FileExtensionEnum> = {
  [MimeTypesEnum.JPEG]: FileExtensionEnum.JPEG,
  [MimeTypesEnum.PNG]: FileExtensionEnum.PNG,
  [MimeTypesEnum.JPG]: FileExtensionEnum.JPG,
  [MimeTypesEnum.GIF]: FileExtensionEnum.GIF,
  [MimeTypesEnum.WEBP]: FileExtensionEnum.WEBP,
};
