import {
  camelCase,
  capitalCase,
  constantCase,
  kebabCase,
  pascalCase,
  snakeCase,
} from './utils/change-case';
import { IOptions } from './utils/change-case/functions';
import { deepmerge } from './utils/deepmerge.utils';
import { WithPassthrough } from './utils/types';

export enum CasingEnum {
  CAMEL_CASE = 'camelCase',
  PASCAL_CASE = 'PascalCase',
  CAPITAL_CASE = 'CapitalCase',
  SNAKE_CASE = 'snake_case',
  KEBAB_CASE = 'kebabcase',
  CONSTANT_CASE = 'CONSTANT_CASE',
}

type TransformOutput<T> = {
  body: T;
  headers: Record<string, string>;
  query: Record<string, string>;
};

export abstract class BaseProvider {
  protected casing: CasingEnum | undefined;

  protected keyCaseObject: Record<string, string> = {};

  protected transform<
    T_Output = Record<string, unknown>,
    T_Input = Record<string, unknown>,
    T_Data = Record<string, unknown>
  >(
    bridgeProviderData: WithPassthrough<T_Input>,
    triggerProviderData: T_Data
  ): TransformOutput<T_Output> {
    const {
      _passthrough = {
        body: {},
        headers: {},
        query: {},
      },
      ...bridgeData
    } = bridgeProviderData;
    const result = this.casingTransform(bridgeData);

    return {
      body: deepmerge(
        triggerProviderData as unknown as Record<string, unknown>,
        deepmerge(result, _passthrough.body)
      ) as T_Output,
      headers: _passthrough.headers || {},
      query: _passthrough.query || {},
    } as TransformOutput<T_Output>;
  }

  private keyCaseTransformer(key: string) {
    return this.keyCaseObject[key] ? this.keyCaseObject[key] : key;
  }

  private casingTransform(
    bridgeData: Record<string, unknown>
  ): Record<string, unknown> {
    let casing = (object: unknown, options?: IOptions) => object;

    switch (this.casing) {
      case CasingEnum.PASCAL_CASE:
        casing = pascalCase;
        break;
      case CasingEnum.CAPITAL_CASE:
        casing = capitalCase;
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
    }

    return casing(bridgeData, {
      keyCaseTransformer: this.keyCaseTransformer.bind(this),
    }) as Record<string, unknown>;
  }
}
