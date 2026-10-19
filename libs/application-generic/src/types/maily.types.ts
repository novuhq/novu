export enum MailyContentTypeEnum {
  VARIABLE = 'variable',
  REPEAT = 'repeat',
  /**
   * Legacy enum value maintained for backwards compatibility
   * @deprecated
   */
  FOR = 'for',
  BUTTON = 'button',
  IMAGE = 'image',
  INLINE_IMAGE = 'inlineImage',
  LINK = 'link',
}

export enum MailyAttrsEnum {
  ID = 'id',
  SHOW_IF_KEY = 'showIfKey',
  EACH_KEY = 'each',
  ITERATIONS_KEY = 'iterations',
  FALLBACK = 'fallback',
  ALIAS_FOR = 'aliasFor',
  IS_SRC_VARIABLE = 'isSrcVariable',
  IS_EXTERNAL_LINK_VARIABLE = 'isExternalLinkVariable',
  IS_TEXT_VARIABLE = 'isTextVariable',
  IS_URL_VARIABLE = 'isUrlVariable',
  TEXT = 'text',
  URL = 'url',
  SRC = 'src',
  EXTERNAL_LINK = 'externalLink',
  HREF = 'href',
}

export const MAILY_FIRST_CITIZEN_VARIABLE_KEY = [
  MailyAttrsEnum.ID,
  MailyAttrsEnum.SHOW_IF_KEY,
  MailyAttrsEnum.EACH_KEY,
];
