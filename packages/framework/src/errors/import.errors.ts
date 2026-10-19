import { ErrorCodeEnum, HttpStatusEnum } from '../constants';
import { ServerError } from './base.errors';

export class MissingDependencyError extends ServerError {
  statusCode = HttpStatusEnum.INTERNAL_SERVER_ERROR;
  code = ErrorCodeEnum.MISSING_DEPENDENCY_ERROR;

  constructor(usageReason: string, missingDependencies: string[]) {
    const pronoun = missingDependencies.length === 1 ? 'it' : 'them';
    super(
      `Tried to use a ${usageReason} in @novu/framework without ${missingDependencies.join(
        ', '
      )} installed. Please install ${pronoun} by running \`npm install ${missingDependencies.join(' ')}\`.`
    );
  }
}
