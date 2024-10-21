import { HttpStatusEnum, PostActionEnum, ResourceEnum } from '../constants';
import { toPascalCase } from '../utils/string.utils';
import { ConflictError, NotFoundError, ServerError } from './base.errors';

export abstract class ResourceConflictError extends ConflictError {
  constructor(resource: ResourceEnum, id: string) {
    super(`${toPascalCase(resource)} with id: \`${id}\` already exists. Please use a different id.`);
  }
}

export abstract class ResourceNotFoundError extends NotFoundError {
  constructor(resource: ResourceEnum, id: string) {
    super(`${toPascalCase(resource)} with id: \`${id}\` does not exist. Please provide a valid id.`);
  }
}

export abstract class ResourceExecutionFailed extends ServerError {
  statusCode = HttpStatusEnum.BAD_GATEWAY;
  constructor(resource: ResourceEnum, id: string, action: PostActionEnum, cause: unknown) {
    super(`Failed to ${action} ${toPascalCase(resource)} with id: \`${id}\``, { cause });
  }
}
