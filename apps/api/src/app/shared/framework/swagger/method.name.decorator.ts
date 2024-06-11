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
