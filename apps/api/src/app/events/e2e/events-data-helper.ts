import { NotificationTemplateEntity, SubscriberEntity } from '@novu/dal';
import { StepTypeEnum, DigestTypeEnum, DigestUnitEnum, DelayTypeEnum, EmailBlockTypeEnum } from '@novu/shared';
import { random, set, get } from 'lodash';
import { constructActiveDAG, StepWithDelay } from '../helpers/helpers';
import { UserSession, SubscribersService } from '@novu/testing';

export class EventsDataGenerator {
  NUMBER_OF_SUBSCRIBERS = 10;
  private subscribers: SubscriberEntity[] = [];
  private subscriberService: SubscribersService;
  constructor(private session: UserSession) {
    this.subscriberService = new SubscribersService(session.organization._id, session.environment._id);
    this.createSubscribers();
  }

  private async createSubscribers() {
    for (let index = 0; index < this.NUMBER_OF_SUBSCRIBERS; index++) {
      const subscriber = await this.subscriberService.createSubscriber();
      this.subscribers.push(subscriber);
    }
  }
  public async triggerMultipleEvents(numberOfEvenets) {
    const template = await this.createTemplate();

    return await this.triggerEventByTemplate(template, numberOfEvenets);
  }
  triggerEventByTemplate = async (template: NotificationTemplateEntity, numberOfEvenets = 1) => {
    const payloadArray = [];
    for (let index = 0; index < numberOfEvenets; index++) {
      const payloadTemp = await this.generatePayload(template);
      payloadArray.push(payloadTemp);
    }
    const triggerName = template.triggers[0].identifier;
    await Promise.all(
      payloadArray.map(async (payload) => {
        const subscriber = this.subscribers[random(0, this.subscribers.length - 1)];
        payload.subscriberId = subscriber._id;
        await this.session.triggerEvent(triggerName, [subscriber.subscriberId], payload);
      })
    );

    return { template, payloadArray };
  };
  async createTemplate(): Promise<NotificationTemplateEntity> {
    const stepsInChain = random(3, 9);
    const steps: any = [];
    const DIGEST_PERCENT = 15;
    const DELAY_PERCENT = 15;

    for (let index = 0; index < stepsInChain; index++) {
      const val = random(0, 100);
      const step =
        val < DIGEST_PERCENT
          ? createDigestStep()
          : val < DIGEST_PERCENT + DELAY_PERCENT
          ? createDelayStep()
          : createChannelStep();
      steps.push(await step);
    }

    return await this.session.createTemplate({ steps });
  }

  async generatePayload(template: NotificationTemplateEntity) {
    const digestValues = ['value1', 'value2', 'value3', 'value4', 'value5', 'value6', 'value7', 'value8', 'value9'];
    const digestKeys = template.steps
      .filter((step) => step.template?.type === StepTypeEnum.DIGEST)
      .map((step) => step.metadata?.digestKey);
    const payload = { customVariable: 'custom variable', EventsDataGenerator: true };
    digestKeys.forEach((digestKey) => set(payload, digestKey, digestValues[random(0, digestValues.length - 1)]));

    return payload;
  }
}

const CHANNELS_TO_TEST: StepTypeEnum[] = [StepTypeEnum.IN_APP, StepTypeEnum.EMAIL, StepTypeEnum.SMS, StepTypeEnum.CHAT];

async function createChannelStep(): Promise<any> {
  const STEP_ACTIVE_PERCENT = 95;
  const type = CHANNELS_TO_TEST[random(0, CHANNELS_TO_TEST.length - 1)];
  const content =
    `${type}:Step Hello world {{step.events.length}} {{#if step.digest}} HAS_DIGEST_PROP {{else}} NO_DIGEST_PROP {{/if}}` as string;

  return {
    active: random(0, 100) <= STEP_ACTIVE_PERCENT,
    type,
    subject: 'Test subject',
    content: type !== StepTypeEnum.EMAIL ? content : [{ type: EmailBlockTypeEnum.TEXT, content }],
  };
}

const createDelayStep = () => {
  const DELAY_ACTIVE_PERCENT = 95;
  const DELAY_PATH_PERCENT = 30;
  const delayPath = random(0, 100) <= DELAY_PATH_PERCENT ? 'sendAt' : null;
  const amount = random(1, 100);

  return {
    active: random(0, 100) <= DELAY_ACTIVE_PERCENT,
    type: StepTypeEnum.DELAY,
    content: '',
    metadata: !delayPath
      ? { type: DelayTypeEnum.REGULAR, unit: DigestUnitEnum.MINUTES, amount: amount }
      : { type: DelayTypeEnum.SCHEDULED, delayPath: delayPath },
  };
};

async function createDigestStep(): Promise<any> {
  const BACKOFF_PERCENT = 10;
  const DIGEST_ACTIVE_PERCENT = 95;
  const backoff = random(0, 100) <= BACKOFF_PERCENT;
  const digestKey = random(0, 10) <= 5 ? 'nested.digest_key_' + random(0, 6) : 'digest_key_' + random(0, 6);

  return {
    active: random(0, 100) <= DIGEST_ACTIVE_PERCENT,
    type: StepTypeEnum.DIGEST,
    content: '',
    metadata: {
      unit: DigestUnitEnum.MINUTES,
      amount: 5,
      digestKey,
      type: backoff ? DigestTypeEnum.BACKOFF : DigestTypeEnum.REGULAR,
      ...(backoff && { backoffUnit: DigestUnitEnum.MINUTES, backoffAmount: 5 }),
    },
  };
}

export const totalExpectedJobCounts = (template, payloadArray) => {
  const subscriberStepDigestCounts = new Map<string, Map<string, number>>();
  let totalJobCount = 0;
  let digestJobCount = 0;
  let digestChildJobCount = 0;
  const temp = constructActiveDAG(template.steps, {}, {});
  for (const payload of payloadArray) {
    const dag = constructActiveDAG(template.steps, payload, {});
    for (const branch of dag) {
      if (branch[0].template?.type === StepTypeEnum.DIGEST) {
        if (branch.length === 1) continue; //only digest step
        const digestKey = branch[0].metadata?.digestKey;
        let digestValue = get(payload, digestKey);
        const backoff = branch[0].metadata?.type === DigestTypeEnum.BACKOFF;
        const key = payload.subscriberId + '_' + branch[0]._templateId;
        if (!digestValue) digestValue = undefined;
        let digestCounts = subscriberStepDigestCounts.get(key);
        if (!digestCounts) {
          digestCounts = new Map<string, number>();
          subscriberStepDigestCounts.set(key, digestCounts);
        }
        const valueCount = digestCounts.get(digestValue) ?? 0;
        if (backoff && valueCount === 0) totalJobCount += branch.length - 1;
        else if ((!backoff && valueCount === 0) || (backoff && valueCount === 1)) {
          totalJobCount += branch.length;
          digestChildJobCount += branch.length - 1;
          digestJobCount += 1;
        }
        digestCounts.set(digestValue, valueCount + 1);
      } else totalJobCount += branch.length;
    }
  }

  return { digestJobCount, totalJobCount, digestChildJobCount };
};
