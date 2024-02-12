/* eslint-disable @typescript-eslint/naming-convention */

import { ApiExtraModels, getSchemaPath } from '@nestjs/swagger';
import { Type, applyDecorators } from '@nestjs/common';
import { DataWrapperDto } from '../dtos/data-wrapper-dto';
import { customResponseDecorators } from './swagger/responses.decorator';
import { COMMON_RESPONSES } from './constants/responses.schema';

export const ApiOkResponse = customResponseDecorators.ApiOkResponse;
export const ApiCreatedResponse = customResponseDecorators.ApiCreatedResponse;
export const ApiAcceptedResponse = customResponseDecorators.ApiAcceptedResponse;
export const ApiNoContentResponse = customResponseDecorators.ApiNoContentResponse;
export const ApiMovedPermanentlyResponse = customResponseDecorators.ApiMovedPermanentlyResponse;
export const ApiFoundResponse = customResponseDecorators.ApiFoundResponse;
export const ApiBadRequestResponse = customResponseDecorators.ApiBadRequestResponse;
export const ApiUnauthorizedResponse = customResponseDecorators.ApiUnauthorizedResponse;
export const ApiTooManyRequestsResponse = customResponseDecorators.ApiTooManyRequestsResponse;
export const ApiNotFoundResponse = customResponseDecorators.ApiNotFoundResponse;
export const ApiInternalServerErrorResponse = customResponseDecorators.ApiInternalServerErrorResponse;
export const ApiBadGatewayResponse = customResponseDecorators.ApiBadGatewayResponse;
export const ApiConflictResponse = customResponseDecorators.ApiConflictResponse;
export const ApiForbiddenResponse = customResponseDecorators.ApiForbiddenResponse;
export const ApiGatewayTimeoutResponse = customResponseDecorators.ApiGatewayTimeoutResponse;
export const ApiGoneResponse = customResponseDecorators.ApiGoneResponse;
export const ApiMethodNotAllowedResponse = customResponseDecorators.ApiMethodNotAllowedResponse;
export const ApiNotAcceptableResponse = customResponseDecorators.ApiNotAcceptableResponse;
export const ApiNotImplementedResponse = customResponseDecorators.ApiNotImplementedResponse;
export const ApiPreconditionFailedResponse = customResponseDecorators.ApiPreconditionFailedResponse;
export const ApiPayloadTooLargeResponse = customResponseDecorators.ApiPayloadTooLargeResponse;
export const ApiRequestTimeoutResponse = customResponseDecorators.ApiRequestTimeoutResponse;
export const ApiServiceUnavailableResponse = customResponseDecorators.ApiServiceUnavailableResponse;
export const ApiUnprocessableEntityResponse = customResponseDecorators.ApiUnprocessableEntityResponse;
export const ApiUnsupportedMediaTypeResponse = customResponseDecorators.ApiUnsupportedMediaTypeResponse;
export const ApiDefaultResponse = customResponseDecorators.ApiDefaultResponse;

export const ApiResponse = <DataDto extends Type<unknown>>(
  dataDto: DataDto,
  statusCode: 200 | 201 = 200,
  isResponseArray = false
) => {
  const Response = statusCode === 201 ? ApiCreatedResponse : ApiOkResponse;

  return applyDecorators(
    ApiExtraModels(DataWrapperDto, dataDto),
    Response({
      description: statusCode === 201 ? 'Created' : 'Ok',
      schema: {
        properties: isResponseArray
          ? { data: { type: 'array', items: { $ref: getSchemaPath(dataDto) } } }
          : { data: { $ref: getSchemaPath(dataDto) } },
      },
    })
  );
};

export const ApiCommonResponses = () => {
  return applyDecorators(
    ...Object.entries(COMMON_RESPONSES).map(([decoratorName, responseOptions]) =>
      customResponseDecorators[decoratorName](responseOptions)
    )
  );
};
