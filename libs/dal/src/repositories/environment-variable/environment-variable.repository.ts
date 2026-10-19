import { EnvironmentId } from '@novu/shared';
import { EnforceOrgId } from '../../types';
import { BaseRepositoryV2 } from '../base-repository-v2';
import { EnvironmentVariableDBModel, EnvironmentVariableEntity } from './environment-variable.entity';
import { EnvironmentVariable } from './environment-variable.schema';

export type EnvironmentVariableForTemplate = {
  key: string;
  value: string;
  isSecret: boolean;
};

export class EnvironmentVariableRepository extends BaseRepositoryV2<
  EnvironmentVariableDBModel,
  EnvironmentVariableEntity,
  EnforceOrgId
> {
  constructor() {
    super(EnvironmentVariable, EnvironmentVariableEntity);
  }

  async findByEnvironment(
    organizationId: string,
    environmentId: EnvironmentId
  ): Promise<EnvironmentVariableForTemplate[]> {
    const results = await this.MongooseModel.find(
      { _organizationId: organizationId, 'values._environmentId': environmentId },
      { _id: 0, key: 1, isSecret: 1, 'values.$': 1 }
    )
      .read('secondaryPreferred')
      .lean();

    return results.map((doc) => ({
      key: doc.key,
      value: doc.values[0].value,
      isSecret: doc.isSecret,
    }));
  }
}
