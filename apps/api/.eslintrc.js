module.exports = {
  extends: ['../../.eslintrc.js'],
  rules: {
    'func-names': 'off',
    "no-restricted-imports": ["error", {
      "patterns": [{
        "group": ["@nestjs/swagger"],
        "importNames": [
          'ApiOkResponse',
          'ApiCreatedResponse',
          'ApiAcceptedResponse',
          'ApiNoContentResponse',
          'ApiMovedPermanentlyResponse',
          'ApiFoundResponse',
          'ApiBadRequestResponse',
          'ApiUnauthorizedResponse',
          'ApiTooManyRequestsResponse',
          'ApiNotFoundResponse',
          'ApiInternalServerErrorResponse',
          'ApiBadGatewayResponse',
          'ApiConflictResponse',
          'ApiForbiddenResponse',
          'ApiGatewayTimeoutResponse',
          'ApiGoneResponse',
          'ApiMethodNotAllowedResponse',
          'ApiNotAcceptableResponse',
          'ApiNotImplementedResponse',
          'ApiPreconditionFailedResponse',
          'ApiPayloadTooLargeResponse',
          'ApiRequestTimeoutResponse',
          'ApiServiceUnavailableResponse',
          'ApiUnprocessableEntityResponse',
          'ApiUnsupportedMediaTypeResponse',
          'ApiDefaultResponse',
        ],
        "message": "Use 'Api<Error>Response' from '/shared/framework/response.decorator' instead."
      }]
    }]
  },
  parserOptions: {
    project: './tsconfig.json',
    ecmaVersion: 2020,
    sourceType: 'module',
    tsconfigRootDir: __dirname,
  },
  ignorePatterns: '*.spec.ts',
};
