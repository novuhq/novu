import { ApiExtension } from '@nestjs/swagger';
import { applyDecorators } from '@nestjs/common';

//eslint-disable-next-line @typescript-eslint/naming-convention
export function SdkUsePagination(override?: string) {
  return applyDecorators(
    ApiExtension('x-speakeasy-pagination', {
      type: 'offsetLimit',
      inputs: [
        {
          name: 'page',
          in: 'parameters',
          type: 'page',
        },
        {
          name: override || 'limit',
          in: 'parameters',
          type: 'limit',
        },
      ],
      outputs: {
        results: '$.data.resultArray',
      },
    })
  );
}
