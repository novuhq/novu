/* eslint-disable no-restricted-imports */
/* eslint-disable @typescript-eslint/naming-convention */

import { applyDecorators } from '@nestjs/common';
import * as nestSwagger from '@nestjs/swagger';
import { ApiResponseOptions } from '@nestjs/swagger';
import { COMMON_RESPONSE_HEADERS, COMMON_RESPONSES } from '../constants';
import { ApiResponseDecoratorName } from '../types';
import { createReusableHeaders } from './headers.decorator';

const createCustomResponseDecorator = (decoratorName: ApiResponseDecoratorName) => {
  return (options?: ApiResponseOptions) => {
    return applyDecorators(
      nestSwagger[decoratorName]({
        ...COMMON_RESPONSES[decoratorName],
        ...options,
        headers: {
          ...createReusableHeaders(COMMON_RESPONSE_HEADERS),
          ...options?.headers,
        },
      })
    );
  };
};

const nestSwaggerResponseExports = Object.keys(nestSwagger).filter(
  (key) => key.match(/^Api([a-zA-Z]+)Response$/) !== null
) as Array<ApiResponseDecoratorName>;

export const customResponseDecorators = nestSwaggerResponseExports.reduce((acc, decoratorName) => {
  return {
    ...acc,
    [decoratorName]: createCustomResponseDecorator(decoratorName),
  };
}, {} as Record<ApiResponseDecoratorName, (options?: ApiResponseOptions) => ReturnType<typeof applyDecorators>>);
