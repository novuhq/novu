import { StepTypeEnum, DelayTypeEnum, DigestUnitEnum, DigestTypeEnum } from '@novu/shared';
import { sub, differenceInMilliseconds } from 'date-fns';
import { ApiException } from '../../shared/exceptions/api.exception';
import { NotificationStepEntity } from '@novu/dal';
import { get } from 'lodash';

export type StepWithDelay = NotificationStepEntity & { delay: number };

//digest and delay with delayPath always on top of DAG, delays are added to next active node and removed delay nodes
export function constructActiveDAG(steps: NotificationStepEntity[], payload, overrides): StepWithDelay[][] {
  const allBranches = steps.reduce((dag, step, i) => {
    if (step.template?.type === StepTypeEnum.DIGEST || step.metadata?.delayPath || dag.length == 0) dag.push([]);
    dag[dag.length - 1].push({ ...step, delay: 0 });

    return dag;
  }, [] as StepWithDelay[][]);

  return allBranches
    .map((branch) => {
      const inactiveIndex = branch.findIndex((step) => !step.active);
      branch = inactiveIndex === -1 ? branch : branch.slice(0, inactiveIndex);
      if (branch[0]?.template?.type === StepTypeEnum.DIGEST) branch[0].delay = getDigestDelay(branch[0]);
      branch.forEach((step, index) => {
        if (step.template?.type === StepTypeEnum.DELAY) {
          const delay = calculateDelay(step, payload, overrides);
          if (index + 1 < branch.length && delay > 0) {
            branch[index + 1].delay += delay;
          }
        }
      });

      return branch.filter(({ template }) => template?.type !== StepTypeEnum.DELAY);
    })
    .filter((branch) => branch.length > 0);
}

export function toMilliseconds(amount: number, unit: DigestUnitEnum): number {
  let delay = 1000 * amount;
  if (unit === DigestUnitEnum.DAYS) {
    delay = 60 * 60 * 24 * delay;
  }
  if (unit === DigestUnitEnum.HOURS) {
    delay = 60 * 60 * delay;
  }
  if (unit === DigestUnitEnum.MINUTES) {
    delay = 60 * delay;
  }

  return delay;
}

export function calculateDelay(step, payload, overrides) {
  if (!step.metadata) throw new ApiException(`Step metadata not found`);
  if (step.metadata.type === DelayTypeEnum.SCHEDULED) {
    if (!step.metadata.delayPath) throw new ApiException(`Delay path not found`);
    const delayDate = get(payload, step.metadata.delayPath);
    if (delayDate) return differenceInMilliseconds(new Date(delayDate), new Date()) + 1000;
  }
  const delayAmount = overrides.delay?.amount ? overrides.delay.amount : step.metadata.amount;
  const delayUnits = overrides.delay?.unit ? overrides.delay.unit : step.metadata.unit;

  return toMilliseconds(delayAmount as number, delayUnits as DigestUnitEnum);
}

function getDigestDelay(step: NotificationStepEntity) {
  if (!step.metadata?.amount || !step.metadata.unit) throw new ApiException('Invalid digest amount or unit');

  return toMilliseconds(step.metadata.amount, step.metadata.unit);
}

export function getBackoffDate(step: NotificationStepEntity) {
  return sub(new Date(), {
    [step.metadata?.backoffUnit]: step.metadata?.backoffAmount,
  });
}
