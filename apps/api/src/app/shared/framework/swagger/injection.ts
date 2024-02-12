import { OpenAPIObject } from '@nestjs/swagger';
import { injectReusableHeaders } from './headers.decorator';

export const injectDocumentComponents = (document: OpenAPIObject): OpenAPIObject => {
  const injectedResponseHeadersDocument = injectReusableHeaders(document);

  return injectedResponseHeadersDocument;
};
