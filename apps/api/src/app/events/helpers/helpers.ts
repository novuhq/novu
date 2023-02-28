import { StepTypeEnum, DelayTypeEnum, DigestUnitEnum, DigestTypeEnum } from '@novu/shared';
import { sub, differenceInMilliseconds } from 'date-fns';
import { ApiException } from '../../shared/exceptions/api.exception';
import { NotificationStepEntity } from '@novu/dal';
import { get } from 'lodash';

export type StepWithDelay = NotificationStepEntity & { delay: number };

//digest and delay with delayPath always on top of dag, delays are added to next active node and removed delay nodes
export function constructActiveDAG(steps: NotificationStepEntity[], payload = {}, overrides = {}): StepWithDelay[][] {
  const dag = constructBasicDAG(steps);

  return overrideDelaysAndRemoveDelaySteps(dag, payload, overrides);
}

function constructBasicDAG(steps: NotificationStepEntity[]): StepWithDelay[][] {
  const resultDag = steps.reduce((dag, step, i) => {
    if (step.template?.type === StepTypeEnum.DIGEST || step.metadata?.delayPath || dag.length == 0) dag.push([]);
    dag[dag.length - 1].push({ ...step, delay: getMetaDelay(step) });

    return dag;
  }, [] as StepWithDelay[][]);

  return resultDag.map((branch) => {
    const inactiveIndex = branch.findIndex((step) => !step.active);

    return inactiveIndex === -1 ? branch : branch.slice(0, inactiveIndex);
  });
}

function overrideDelaysAndRemoveDelaySteps(dag: StepWithDelay[][], payload, overrides) {
  return dag
    .map((branch) => {
      branch.forEach((step, index) => {
        if (step.template?.type === StepTypeEnum.DELAY) {
          const delay = getDelayFromPayloadAndOverrides(step, payload, overrides);
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

function getDelayFromPayloadAndOverrides(step, payload, overrides) {
  if (!step.metadata) throw new ApiException(`Step metadata not found`);
  let delay = 0;
  if (step.metadata.type === DelayTypeEnum.SCHEDULED) {
    if (!step.metadata.delayPath) throw new ApiException(`Delay path not found`);
    const delayDate = get(payload, step.metadata.delayPath);
    if (delayDate) delay = differenceInMilliseconds(new Date(delayDate), new Date()) + 1000;
  }
  if (delay <= 0 && overrides?.delay?.amount && overrides?.delay?.unit)
    delay = toMilliseconds(overrides.delay?.amount as number, overrides.delay.unit as DigestUnitEnum);

  return delay > 0 ? delay : step.delay;
}

function getMetaDelay(step: NotificationStepEntity) {
  if (!step.metadata?.amount || !step.metadata?.unit) {
    if (step?.template?.type === StepTypeEnum.DIGEST) throw new ApiException('Invalid digest amount or unit');
    else return 0;
  }
  const delay = toMilliseconds(step.metadata.amount, step.metadata.unit);
  if (delay >= 0) return delay;
  throw new ApiException('Negative delay specified in metadata');
}

export function getBackoffDate(step: NotificationStepEntity) {
  return sub(new Date(), {
    [step.metadata?.backoffUnit]: step.metadata?.backoffAmount,
  });
}
