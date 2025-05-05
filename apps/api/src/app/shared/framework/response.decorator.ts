import {
  ApiExpectationFailedResponse,
  ApiExtraModels,
  ApiHttpVersionNotSupportedResponse,
  ApiLengthRequiredResponse,
  ApiNonAuthoritativeInformationResponse,
  ApiNotModifiedResponse,
  ApiPartialContentResponse,
  ApiPaymentRequiredResponse,
  ApiPermanentRedirectResponse,
  ApiProxyAuthenticationRequiredResponse,
  ApiRequestedRangeNotSatisfiableResponse,
  ApiResetContentResponse,
  ApiResponseOptions,
  ApiSeeOtherResponse,
  ApiUriTooLongResponse,
  getSchemaPath,
} from '@nestjs/swagger';
import { applyDecorators, Type } from '@nestjs/common';
import { customResponseDecorators } from './swagger/responses.decorator';
import { COMMON_RESPONSES } from './constants/responses.schema';
import { DataWrapperDto } from '../dtos/data-wrapper-dto';

import { ErrorDto, ValidationErrorDto } from '../../../error-dto';

export const { ApiOkResponse }: { ApiOkResponse: (options?: ApiResponseOptions) => MethodDecorator } =
  customResponseDecorators;
export const { ApiCreatedResponse }: { ApiCreatedResponse: (options?: ApiResponseOptions) => MethodDecorator } =
  customResponseDecorators;
export const { ApiAcceptedResponse }: { ApiAcceptedResponse: (options?: ApiResponseOptions) => MethodDecorator } =
  customResponseDecorators;
export const { ApiNoContentResponse }: { ApiNoContentResponse: (options?: ApiResponseOptions) => MethodDecorator } =
  customResponseDecorators;
export const {
  ApiMovedPermanentlyResponse,
}: { ApiMovedPermanentlyResponse: (options?: ApiResponseOptions) => MethodDecorator } = customResponseDecorators;
export const {
  ApiTemporaryRedirectResponse,
}: { ApiTemporaryRedirectResponse: (options?: ApiResponseOptions) => MethodDecorator } = customResponseDecorators;
export const { ApiFoundResponse }: { ApiFoundResponse: (options?: ApiResponseOptions) => MethodDecorator } =
  customResponseDecorators;
export const { ApiBadRequestResponse }: { ApiBadRequestResponse: (options?: ApiResponseOptions) => MethodDecorator } =
  customResponseDecorators;
export const {
  ApiUnauthorizedResponse,
}: { ApiUnauthorizedResponse: (options?: ApiResponseOptions) => MethodDecorator } = customResponseDecorators;
export const {
  ApiTooManyRequestsResponse,
}: { ApiTooManyRequestsResponse: (options?: ApiResponseOptions) => MethodDecorator } = customResponseDecorators;
export const { ApiNotFoundResponse }: { ApiNotFoundResponse: (options?: ApiResponseOptions) => MethodDecorator } =
  customResponseDecorators;
export const {
  ApiInternalServerErrorResponse,
}: { ApiInternalServerErrorResponse: (options?: ApiResponseOptions) => MethodDecorator } = customResponseDecorators;
export const { ApiBadGatewayResponse }: { ApiBadGatewayResponse: (options?: ApiResponseOptions) => MethodDecorator } =
  customResponseDecorators;
export const { ApiConflictResponse }: { ApiConflictResponse: (options?: ApiResponseOptions) => MethodDecorator } =
  customResponseDecorators;
export const { ApiForbiddenResponse }: { ApiForbiddenResponse: (options?: ApiResponseOptions) => MethodDecorator } =
  customResponseDecorators;
export const {
  ApiGatewayTimeoutResponse,
}: { ApiGatewayTimeoutResponse: (options?: ApiResponseOptions) => MethodDecorator } = customResponseDecorators;
export const { ApiGoneResponse }: { ApiGoneResponse: (options?: ApiResponseOptions) => MethodDecorator } =
  customResponseDecorators;
export const {
  ApiMethodNotAllowedResponse,
}: { ApiMethodNotAllowedResponse: (options?: ApiResponseOptions) => MethodDecorator } = customResponseDecorators;
export const {
  ApiNotAcceptableResponse,
}: { ApiNotAcceptableResponse: (options?: ApiResponseOptions) => MethodDecorator } = customResponseDecorators;
export const {
  ApiNotImplementedResponse,
}: { ApiNotImplementedResponse: (options?: ApiResponseOptions) => MethodDecorator } = customResponseDecorators;
export const {
  ApiPreconditionFailedResponse,
}: { ApiPreconditionFailedResponse: (options?: ApiResponseOptions) => MethodDecorator } = customResponseDecorators;
export const {
  ApiPayloadTooLargeResponse,
}: { ApiPayloadTooLargeResponse: (options?: ApiResponseOptions) => MethodDecorator } = customResponseDecorators;
export const {
  ApiRequestTimeoutResponse,
}: { ApiRequestTimeoutResponse: (options?: ApiResponseOptions) => MethodDecorator } = customResponseDecorators;
export const {
  ApiServiceUnavailableResponse,
}: { ApiServiceUnavailableResponse: (options?: ApiResponseOptions) => MethodDecorator } = customResponseDecorators;
export const {
  ApiUnprocessableEntityResponse,
}: { ApiUnprocessableEntityResponse: (options?: ApiResponseOptions) => MethodDecorator } = customResponseDecorators;
export const {
  ApiUnsupportedMediaTypeResponse,
}: { ApiUnsupportedMediaTypeResponse: (options?: ApiResponseOptions) => MethodDecorator } = customResponseDecorators;
export const { ApiDefaultResponse }: { ApiDefaultResponse: (options?: ApiResponseOptions) => MethodDecorator } =
  customResponseDecorators;

function buildEnvelopeProperties<DataDto extends Type<unknown>>(isResponseArray: boolean, dataDto: DataDto) {
  if (isResponseArray) {
    return {
      data: {
        type: 'array',
        items: { $ref: getSchemaPath(dataDto) },
      },
    };
  } else {
    return { data: { $ref: getSchemaPath(dataDto) } };
  }
}

function buildSchema<DataDto extends Type<unknown>>(
  shouldEnvelope: boolean,
  isResponseArray: boolean,
  dataDto: DataDto
) {
  if (shouldEnvelope) {
    return {
      properties: buildEnvelopeProperties(isResponseArray, dataDto),
    };
  }

  return { $ref: getSchemaPath(dataDto) };
}
export const ApiResponse = <DataDto extends Type<unknown>>(
  dataDto: DataDto,
  statusCode: number = 200,
  isResponseArray = false,
  shouldEnvelope = true,
  options?: ApiResponseOptions
) => {
  let responseDecoratorFunction;
  let description = 'Ok'; // Default description

  switch (statusCode) {
    // 2XX Success
    case 200:
      responseDecoratorFunction = ApiOkResponse;
      description = 'OK';
      break;
    case 201:
      responseDecoratorFunction = ApiCreatedResponse;
      description = 'Created';
      break;
    case 202:
      responseDecoratorFunction = ApiAcceptedResponse;
      description = 'Accepted';
      break;
    case 203:
      responseDecoratorFunction = ApiNonAuthoritativeInformationResponse;
      description = 'Non-Authoritative Information';
      break;
    case 204:
      responseDecoratorFunction = ApiNoContentResponse;
      description = 'No Content';
      break;
    case 205:
      responseDecoratorFunction = ApiResetContentResponse;
      description = 'Reset Content';
      break;
    case 206:
      responseDecoratorFunction = ApiPartialContentResponse;
      description = 'Partial Content';
      break;

    // 3XX Redirection
    case 301:
      responseDecoratorFunction = ApiMovedPermanentlyResponse;
      description = 'Moved Permanently';
      break;
    case 302:
      responseDecoratorFunction = ApiFoundResponse;
      description = 'Found';
      break;
    case 303:
      responseDecoratorFunction = ApiSeeOtherResponse;
      description = 'See Other';
      break;
    case 304:
      responseDecoratorFunction = ApiNotModifiedResponse;
      description = 'Not Modified';
      break;
    case 305:
      responseDecoratorFunction = ApiProxyAuthenticationRequiredResponse;
      description = 'Use Proxy';
      break;
    case 307:
      responseDecoratorFunction = ApiTemporaryRedirectResponse;
      description = 'Temporary Redirect';
      break;
    case 308:
      responseDecoratorFunction = ApiPermanentRedirectResponse;
      description = 'Permanent Redirect';
      break;

    // 4XX Client Errors
    case 400:
      responseDecoratorFunction = ApiBadRequestResponse;
      description = 'Bad Request';
      break;
    case 401:
      responseDecoratorFunction = ApiUnauthorizedResponse;
      description = 'Unauthorized';
      break;
    case 402:
      responseDecoratorFunction = ApiPaymentRequiredResponse;
      description = 'Payment Required';
      break;
    case 403:
      responseDecoratorFunction = ApiForbiddenResponse;
      description = 'Forbidden';
      break;
    case 404:
      responseDecoratorFunction = ApiNotFoundResponse;
      description = 'Not Found';
      break;
    case 405:
      responseDecoratorFunction = ApiMethodNotAllowedResponse;
      description = 'Method Not Allowed';
      break;
    case 406:
      responseDecoratorFunction = ApiNotAcceptableResponse;
      description = 'Not Acceptable';
      break;
    case 407:
      responseDecoratorFunction = ApiProxyAuthenticationRequiredResponse;
      description = 'Proxy Authentication Required';
      break;
    case 408:
      responseDecoratorFunction = ApiRequestTimeoutResponse;
      description = 'Request Timeout';
      break;
    case 409:
      responseDecoratorFunction = ApiConflictResponse;
      description = 'Conflict';
      break;
    case 410:
      responseDecoratorFunction = ApiGoneResponse;
      description = 'Gone';
      break;
    case 411:
      responseDecoratorFunction = ApiLengthRequiredResponse;
      description = 'Length Required';
      break;
    case 412:
      responseDecoratorFunction = ApiPreconditionFailedResponse;
      description = 'Precondition Failed';
      break;
    case 413:
      responseDecoratorFunction = ApiPayloadTooLargeResponse;
      description = 'Payload Too Large';
      break;
    case 414:
      responseDecoratorFunction = ApiUriTooLongResponse;
      description = 'URI Too Long';
      break;
    case 415:
      responseDecoratorFunction = ApiUnsupportedMediaTypeResponse;
      description = 'Unsupported Media Type';
      break;
    case 416:
      responseDecoratorFunction = ApiRequestedRangeNotSatisfiableResponse;
      description = 'Range Not Satisfiable';
      break;
    case 417:
      responseDecoratorFunction = ApiExpectationFailedResponse;
      description = 'Expectation Failed';
      break;
    case 422:
      responseDecoratorFunction = ApiUnprocessableEntityResponse;
      description = 'Unprocessable Entity';
      break;

    // 5XX Server Errors
    case 500:
      responseDecoratorFunction = ApiInternalServerErrorResponse;
      description = 'Internal Server Error';
      break;
    case 501:
      responseDecoratorFunction = ApiNotImplementedResponse;
      description = 'Not Implemented';
      break;
    case 502:
      responseDecoratorFunction = ApiBadGatewayResponse;
      description = 'Bad Gateway';
      break;
    case 503:
      responseDecoratorFunction = ApiServiceUnavailableResponse;
      description = 'Service Unavailable';
      break;
    case 504:
      responseDecoratorFunction = ApiGatewayTimeoutResponse;
      description = 'Gateway Timeout';
      break;
    case 505:
      responseDecoratorFunction = ApiHttpVersionNotSupportedResponse;
      description = 'HTTP Version Not Supported';
      break;

    // Default case
    default:
      responseDecoratorFunction = ApiOkResponse; // Fallback to a default response
      description = 'OK'; // Default description
      break;
  }

  return applyDecorators(
    ApiExtraModels(DataWrapperDto, dataDto),
    responseDecoratorFunction(
      options || {
        description,
        schema: buildSchema(shouldEnvelope, isResponseArray, dataDto),
      }
    )
  );
};
export const ApiCommonResponses = () => {
  const decorators: any = [];

  for (const [decoratorName, responseOptions] of Object.entries(COMMON_RESPONSES)) {
    const decorator = customResponseDecorators[decoratorName](responseOptions);
    decorators.push(decorator);
  }

  return applyDecorators(
    ...decorators,
    ApiResponse(ErrorDto, 400, false, false),
    ApiResponse(ErrorDto, 401, false, false),
    ApiResponse(ErrorDto, 403, false, false),
    ApiResponse(ErrorDto, 404, false, false),
    ApiResponse(ErrorDto, 405, false, false),
    ApiResponse(ErrorDto, 409, false, false),
    ApiResponse(ErrorDto, 413, false, false),
    ApiResponse(ErrorDto, 414, false, false),
    ApiResponse(ErrorDto, 415, false, false),
    ApiResponse(ErrorDto, 500, false, false),
    ApiResponse(ValidationErrorDto, 422, false, false)
  );
};
