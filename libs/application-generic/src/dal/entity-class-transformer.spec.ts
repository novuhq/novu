import * as dal from '@novu/dal';
import { canSkipClassTransformer } from '@novu/dal';
import { expect } from 'chai';

function isClass(value: unknown): value is new () => unknown {
  return typeof value === 'function' && /^class[\s{]/.test(Function.prototype.toString.call(value));
}

/**
 * DAL repositories map documents with `toEntity` (libs/dal/src/repositories/to-entity.ts),
 * which reproduces `plainToInstance` only for classes without plain-to-class
 * class-transformer metadata (`@Type`, `@Transform`, `@Expose`, or an `@Exclude` that is not
 * `toPlainOnly`), constructor-assigned fields or accessors. Other classes silently take the
 * slower class-transformer path. If this test fails, either drop the decorator or add the
 * class here on purpose and check the cost.
 */
const CLASSES_ON_CLASS_TRANSFORMER_PATH: string[] = [];

describe('DAL entity classes', () => {
  const entityClasses = Object.entries(dal as Record<string, unknown>)
    .filter(([name, value]) => name.endsWith('Entity') && isClass(value))
    .map(([name, value]) => ({ name, entityClass: value as new () => unknown }));

  it('finds the entity classes', () => {
    expect(entityClasses.length).to.be.greaterThan(40);
    expect(entityClasses.map(({ name }) => name)).to.include.members([
      'UserEntity',
      'NotificationTemplateEntity',
      'SubscriberEntity',
      'JobEntity',
      'AgentEntity',
    ]);
  });

  it('can all be mapped without class-transformer', () => {
    const slow = entityClasses
      .filter(({ entityClass }) => !canSkipClassTransformer(entityClass))
      .map(({ name }) => name)
      .filter((name) => !CLASSES_ON_CLASS_TRANSFORMER_PATH.includes(name));

    expect(slow, 'entity classes that need plainToInstance').to.deep.equal([]);
  });
});
