import { OpenAPIObject } from '@nestjs/swagger';
import { injectResponseHeaders } from './headers.decorator';

export const injectDocumentComponents = (document: OpenAPIObject): OpenAPIObject => {
  const injectedResponseHeadersDocument = injectResponseHeaders(document);

  return injectedResponseHeadersDocument;
};
