import { ApiExtension } from '@nestjs/swagger';
import { applyDecorators } from '@nestjs/common';

//eslint-disable-next-line @typescript-eslint/naming-convention
export function SdkMethodName(methodName: string) {
  return applyDecorators(ApiExtension('x-speakeasy-name-override', methodName));
}
// eslint-disable-next-line @typescript-eslint/naming-convention
export function SdkGroupName(methodName: string) {
  return applyDecorators(ApiExtension('x-speakeasy-group', methodName));
}
// eslint-disable-next-line @typescript-eslint/naming-convention
export function SdkIgnorePath(methodName: string) {
  return applyDecorators(ApiExtension('x-speakeasy-ignore', 'true'));
}
// eslint-disable-next-line @typescript-eslint/naming-convention
export function SdkUsageExample(title?: string, description?: string, position?: number) {
  return applyDecorators(ApiExtension('x-speakeasy-usage-example', { title, description, position }));
}

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
