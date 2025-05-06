export type CustomDataType = { [key: string]: string | string[] | boolean | number | undefined };

/**
 * Recursively make all properties of type `T` optional.
 */
export type DeepPartial<T> = T extends object
  ? {
      [P in keyof T]?: DeepPartial<T[P]>;
    }
  : T;

export type Base62Id = string;

export type WorkflowName = string;

export enum ShortIsPrefixEnum {
  WORKFLOW = 'wf_',
  STEP = 'st_',
  ENVIRONMENT = 'env_',
}

export type Slug = `${WorkflowName}_${ShortIsPrefixEnum}${Base62Id}`;
