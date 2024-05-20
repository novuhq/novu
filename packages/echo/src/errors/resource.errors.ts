import { ResourceEnum } from '../constants/resource.constants';
import { toPascalCase } from '../utils';
import { ConflictError, InternalServerError, NotFoundError } from './base.errors';

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

export abstract class ResourceExecutionFailed extends InternalServerError {
  constructor(resource: ResourceEnum, id: string) {
    super(`Failed to execute ${toPascalCase(resource)} with id: \`${id}\`. Please try again later.`);
  }
}

export abstract class ResourcePreviewFailed extends InternalServerError {
  constructor(resource: ResourceEnum, id: string) {
    super(`Failed to preview ${toPascalCase(resource)} with id: \`${id}\`. Please try again later.`);
  }
}
