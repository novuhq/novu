export type CustomDataType = { [key: string]: string | string[] | boolean | number | undefined };

export const NOVU_ENCRYPTION_SUB_MASK = 'nvsk.';

export type EncryptedSecret = `${typeof NOVU_ENCRYPTION_SUB_MASK}${string}`;

export interface IResponseError {
  error: string;
  message: string;
  statusCode: number;
}

export interface IPaginatedResponse<T = unknown> {
  data: T[];
  hasMore: boolean;
  totalCount: number;
  pageSize: number;
  page: number;
}

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
  STEP = 'stp_',
}

export type Slug = `${WorkflowName}_${ShortIsPrefixEnum}${Base62Id}`;
