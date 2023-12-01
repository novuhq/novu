import { HeaderObjects, ResponseHeaderKeysEnum } from '../types';
import { RESPONSE_HEADER_CONFIG } from '../constants/headers.schema';
import { OpenAPIObject } from '@nestjs/swagger';

export const injectResponseHeaders = (document: OpenAPIObject): OpenAPIObject => {
  const newDocument = { ...document };
  newDocument.components = {
    ...document.components,
    headers: Object.entries(RESPONSE_HEADER_CONFIG).reduce((acc, [name, header]) => {
      return {
        ...acc,
        [name]: header,
      };
    }, {} as HeaderObjects),
  };

  return newDocument;
};

export const createResponseHeaders = (headers: Array<ResponseHeaderKeysEnum> = []) => {
  return headers.reduce((acc, header) => {
    return {
      ...acc,
      [header]: {
        $ref: `#/components/headers/${header}`,
      },
    };
  }, {} as HeaderObjects);
};
