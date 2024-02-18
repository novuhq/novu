import { HeaderObjects, HttpResponseHeaderKeysEnum } from '../types';
import { RESPONSE_HEADER_CONFIG } from '../constants/headers.schema';
import { OpenAPIObject } from '@nestjs/swagger';

export const injectReusableHeaders = (document: OpenAPIObject): OpenAPIObject => {
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

export const createReusableHeaders = (headers: Array<HttpResponseHeaderKeysEnum>) => {
  return headers.reduce((acc, header) => {
    return {
      ...acc,
      [header]: {
        $ref: `#/components/headers/${header}`,
      },
    };
  }, {} as HeaderObjects);
};
