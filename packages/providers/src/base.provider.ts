import {
  camelCase,
  constantCase,
  kebabCase,
  pascalCase,
  snakeCase,
} from './utils/change-case';
import { deepMerge } from './utils/deepmerge.utils';
import { Passthrough, WithPassthrough } from './utils/types';

export enum CasingEnum {
  CAMEL_CASE = 'camelCase',
  PASCAL_CASE = 'PascalCase',
  SNAKE_CASE = 'snake_case',
  KEBAB_CASE = 'kebab-case',
  CONSTANT_CASE = 'CONSTANT_CASE',
}

type MergedPassthrough<T> = {
  body: T;
  headers: Record<string, string>;
  query: Record<string, string>;
};

export abstract class BaseProvider {
  /**
   * The casing of the provider API. This is used to transform the @novu/framework provider data from
   * a language-preferred casing to the casing required by the provider.
   *
   * The currently supported casings are:
   * - camelCase
   * - PascalCase
   * - snake_case
   * - kebab-case
   * - CONSTANT_CASE
   */
  protected abstract casing: CasingEnum;

  /**
   * A mapping of keys to their desired casing. This mapping should be
   * defined for providers that have inconsistent casing for the API data.
   */
  protected keyCaseObject: Record<string, string> = {};

  /**
   * Transforms the provider data to the desired casing matching the casing
   * required by the provider. Depending on the provider implementation, the
   * required casing may be different the the API data if the provider implements
   * casing transformation of the SDK data to the API data. Twilio's API is an
   * example of this, where the SDK data is in camelCase but the API data is in
   * PascalCase.
   *
   * @param bridgeProviderData The provider data to transform.
   * @param triggerProviderData The trigger data to transform.
   * @returns The transformed provider data.
   */
  protected transform<
    T_Output = Record<string, unknown>,
    T_Input = Record<string, unknown>,
    T_Data = Record<string, unknown>,
  >(
    bridgeProviderData: WithPassthrough<T_Input>,
    triggerProviderData: T_Data,
  ): MergedPassthrough<T_Output> {
    const { _passthrough = {}, ...bridgeData } = bridgeProviderData;

    // Construct the trigger data passthrough object
    const triggerDataPassthrough: Passthrough = {
      body: triggerProviderData as Record<string, unknown>,
      headers: {},
      query: {},
    };

    // Transform the known provider data to the desired casing
    const brideKnownDataPassthrough: Passthrough = {
      body: this.casingTransform(bridgeData),
      headers: {},
      query: {},
    };

    // Transform the unknown provider data to the desired casing
    const bridgeUnknownDataPassthrough: Passthrough = {
      body: _passthrough.body || {},
      headers: _passthrough.headers || {},
      query: _passthrough.query || {},
    };

    /**
     * Merge the provider data with the following priority, from lowest to highest:
     * 1. Trigger provider data (provided via Events API)
     * 2. Bridge known data (provided via known schematized values)
     * 3. Unknown provider data (provided via `_passthrough`)
     */
    const mergedPassthrough = deepMerge([
      triggerDataPassthrough,
      brideKnownDataPassthrough,
      bridgeUnknownDataPassthrough,
    ]) as MergedPassthrough<T_Output>;

    return mergedPassthrough;
  }

  /**
   * Return the custom key to use for the given key, if it exists in `keyCaseObject`.
   * @param key The key to transform.
   * @returns The transformed key.
   */
  private keyCaseTransformer(key: string) {
    return this.keyCaseObject[key] ? this.keyCaseObject[key] : key;
  }

  /**
   * Transforms the keys of the data to the desired casing.
   * @param data The data to transform.
   * @returns The transformed data, with the keys transformed to the desired casing.
   */
  private casingTransform(
    data: Record<string, unknown>,
  ): Record<string, unknown> {
    let casing = camelCase;

    switch (this.casing) {
      case CasingEnum.PASCAL_CASE:
        casing = pascalCase;
        break;
      case CasingEnum.SNAKE_CASE:
        casing = snakeCase;
        break;
      case CasingEnum.KEBAB_CASE:
        casing = kebabCase;
        break;
      case CasingEnum.CONSTANT_CASE:
        casing = constantCase;
        break;
      case CasingEnum.CAMEL_CASE:
        casing = camelCase;
        break;
      default:
        throw new Error(`Unknown casing: ${this.casing}`);
    }

    return casing(data, {
      keyCaseTransformer: this.keyCaseTransformer.bind(this),
    }) as Record<string, unknown>;
  }
}
