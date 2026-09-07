import { applyDecorators } from '@nestjs/common';
import { ApiExtension, ApiParam, ApiProperty } from '@nestjs/swagger';
import { ApiParamOptions } from '@nestjs/swagger/dist/decorators/api-param.decorator';
import { ApiPropertyOptions } from '@nestjs/swagger/dist/decorators/api-property.decorator';

/**
 * Sets the method name for the SDK.
 * @param {string} methodName - The name of the method.
 * @returns {Decorator} The decorator to be used on the method.
 */

export function SdkMethodName(methodName: string) {
  return applyDecorators(ApiExtension('x-speakeasy-name-override', methodName));
}

/**
 * Sets the group name for the SDK.
 * @param {string} methodName - The name of the group.
 * @returns {Decorator} The decorator to be used on the method.
 */

export function SdkGroupName(methodName: string) {
  return applyDecorators(ApiExtension('x-speakeasy-group', methodName));
}
/**
 * A decorator function that marks a path or operation to be ignored in OpenAPI documentation.
 *
 * This function applies the `x-ignore` extension to the OpenAPI specification,
 * indicating that the decorated path or operation should not be included in the generated documentation.
 *
 * @returns {Function} A decorator function that applies the `x-ignore` extension.
 */
export function DocumentationIgnore() {
  return applyDecorators(ApiExtension('x-ignore', true));
}

/**
 * Ignores the path for the SDK.
 * @param {string} methodName - The name of the method.
 * @returns {Decorator} The decorator to be used on the method.
 */

export function SdkIgnorePath(methodName: string) {
  return applyDecorators(ApiExtension('x-speakeasy-ignore', 'true'));
}

/**
 * Sets the usage example for the SDK.
 * @param {string} title - The title of the example.
 * @param {string} description - The description of the example.
 * @param {number} position - The position of the example.
 * @returns {Decorator} The decorator to be used on the method.
 */

export function SdkUsageExample(title?: string, description?: string, position?: number) {
  return applyDecorators(ApiExtension('x-speakeasy-usage-example', { title, description, position }));
}

/**
 * Sets the maximum number of parameters for the SDK method.
 * @param {number} maxParamsBeforeCollapseToObject - The maximum number of parameters before they are collapsed into an object.
 * @returns {Decorator} The decorator to be used on the method.
 */

export function SdkMethodMaxParamsOverride(maxParamsBeforeCollapseToObject?: number) {
  return applyDecorators(ApiExtension('x-speakeasy-max-method-params', maxParamsBeforeCollapseToObject));
}

class SDKOverrideOptions {
  nameOverride?: string;
}

export function SdkApiParam(options: ApiParamOptions, sdkOverrideOptions?: SDKOverrideOptions) {
  let finalOptions: ApiParamOptions;
  if (sdkOverrideOptions) {
    finalOptions = sdkOverrideOptions.nameOverride
      ? ({ ...options, 'x-speakeasy-name-override': sdkOverrideOptions.nameOverride } as unknown as ApiParamOptions)
      : options;
  } else {
    finalOptions = options;
  }

  return applyDecorators(ApiParam(finalOptions));
}
export function SdkApiProperty(options: ApiPropertyOptions, sdkOverrideOptions?: SDKOverrideOptions) {
  let finalOptions: ApiPropertyOptions;
  if (sdkOverrideOptions) {
    finalOptions = sdkOverrideOptions.nameOverride
      ? ({ ...options, 'x-speakeasy-name-override': sdkOverrideOptions.nameOverride } as unknown as ApiPropertyOptions)
      : options;
  } else {
    finalOptions = options;
  }

  return applyDecorators(ApiProperty(finalOptions));
}
/**
 * Sets the pagination for the SDK.
 * @param {string} override - The override for the limit parameter.
 * @returns {Decorator} The decorator to be used on the method.
 */

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
