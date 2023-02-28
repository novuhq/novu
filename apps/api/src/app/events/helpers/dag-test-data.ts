/*
 *Specs: Sequential chain of paths converted to parallel paths(DAG)
 *1. Digest and delay with path always at the root level of DAG
 *2. Delays are added to next active step and delay steps removed
 *3. Two consecutive delays adds up and added to next active step
 *4. Delays just before digest are ignored
 *5. Delays at the leaf level of branches ignored
 *6. Steps before digest forms a parallel branch
 *7. Delay path step forms parallel branch
 *8. two consecutive digest steps forms two branches, one branch has just digest node
 *9. Negative delays in meta should throw error
 *10. Negative/missing delays in payload and overrides should ignore and proceed with delay 0
 *11. Missing delay path in meta should throw error for delay nodes
 *12. If any inactive step present in the branch then all the steps below will be trimmed
 */

import { StepTypeEnum, DelayTypeEnum, DigestUnitEnum, DigestTypeEnum } from '@novu/shared';
import { addHours, differenceInMilliseconds } from 'date-fns';
import { random } from 'lodash';
import { ApiException } from '../../shared/exceptions/api.exception';

const DELAY_DATE = addHours(new Date(), random(1, 100));
const FIVE_MINS = 5 * 60 * 1000;
const TEN_MINS = 10 * 60 * 1000;
const FIVE_HOURS = 5 * 60 * 60 * 1000;
const TEN_HOURS = 10 * 60 * 60 * 1000;

const DEFAULT_TEMPLATE_PROPERTIES = {
  _id: '63f5d8f84d63a98c8924701d',
  content: '',
  _environmentId: '63f5d8f84d63a98c89246fd0',
  _organizationId: '63f5d8f84d63a98c89246fc7',
  _creatorId: '63f5d8f84d63a98c89246fc5',
  _layoutId: '63f5d8f84d63a98c89246fd6',
  createdAt: '2023-02-22T08:57:28.748Z',
  updatedAt: '2023-02-22T08:57:28.748Z',
};
const DEFAULT_STEP_PROPERTIES = {
  _templateId: '63f5d8f84d63a98c8924701d',
  _id: '63f5d8f84d63a98c89247031',
  delay: 0,
};
const createDelayStep = (active: boolean, amount: number, delayPath: string | null) => {
  return {
    active: active,
    metadata: !delayPath
      ? { type: DelayTypeEnum.REGULAR, unit: DigestUnitEnum.MINUTES, amount: amount }
      : { type: DelayTypeEnum.SCHEDULED, delayPath: delayPath },
    template: {
      type: StepTypeEnum.DELAY,
      active: true,
      ...DEFAULT_TEMPLATE_PROPERTIES,
    },
    ...DEFAULT_STEP_PROPERTIES,
  };
};

const createDigestStep = (active: boolean, amount: number, backoff = false) => {
  return {
    active: active,
    metadata: {
      amount: amount,
      unit: DigestUnitEnum.MINUTES,
      digestKey: 'digest_key_1',
      type: backoff ? DigestTypeEnum.BACKOFF : DigestTypeEnum.REGULAR,
      ...(backoff && { backoffUnit: DigestUnitEnum.MINUTES, backoffAmount: amount }),
    },
    template: {
      type: StepTypeEnum.DIGEST,
      active: true,
      ...DEFAULT_TEMPLATE_PROPERTIES,
    },
    ...DEFAULT_STEP_PROPERTIES,
  };
};

const createStep = (type: StepTypeEnum, active: boolean) => {
  return {
    active: active,
    template: {
      type: type,
      active: true,
      ...DEFAULT_TEMPLATE_PROPERTIES,
    },
    ...DEFAULT_STEP_PROPERTIES,
  };
};

const CHAT = createStep(StepTypeEnum.CHAT, true);
const CHAT_I = createStep(StepTypeEnum.CHAT, false);
const EMAIL = createStep(StepTypeEnum.EMAIL, true);
const EMAIL_I = createStep(StepTypeEnum.EMAIL, false);
const SMS = createStep(StepTypeEnum.SMS, true);
const SMS_I = createStep(StepTypeEnum.SMS, false);
const PUSH = createStep(StepTypeEnum.PUSH, true);
const PUSH_I = createStep(StepTypeEnum.PUSH, false);
const IN_APP = createStep(StepTypeEnum.IN_APP, true);
const IN_APP_I = createStep(StepTypeEnum.IN_APP, false);

const DIGEST_5 = createDigestStep(true, 5);
const DIGEST_5_I = createDigestStep(false, 5);
const NEGATIVE_DIGEST_5 = createDigestStep(true, -5);
const DIGEST_5_BACKOFF = createDigestStep(true, 5, true);
const DIGEST_5_BACKOFF_I = createDigestStep(false, 5, true);
const DIGEST_10 = createDigestStep(true, 10);
const DIGEST_10_I = createDigestStep(false, 10);

const DELAY_5 = createDelayStep(true, 5, null);
const DELAY_5_I = createDelayStep(false, 5, null);
const NEGATIVE_DELAY_5 = createDelayStep(true, -5, null);

const DELAY_10 = createDelayStep(true, 10, null);
const DELAY_10_I = createDelayStep(false, 10, null);
const DELAY_PATH = createDelayStep(true, 0, 'sendAt');
const DELAY_PATH_I = createDelayStep(false, 0, 'sendAt');
const DELAY_PATH_NESTED = createDelayStep(true, 0, 'nested1.dested2.sendAt');
const DELAY_PATH_MISSING = createDelayStep(true, 0, 'nested1.nested2.sendAt');
delete DELAY_PATH_MISSING.metadata.delayPath;

export const DAG_TEST_DATA = [
  {
    title: 'No digest and no delay steps',
    steps: [CHAT, EMAIL, SMS, PUSH, EMAIL],
    expected: [[CHAT, EMAIL, SMS, PUSH, EMAIL]],
  },
  {
    title: 'No digest and no delay but some inactive steps',
    steps: [CHAT, EMAIL, SMS_I, PUSH, EMAIL],
    expected: [[CHAT, EMAIL]],
  },
  {
    title: 'Just single step',
    steps: [EMAIL],
    expected: [[EMAIL]],
  },
  {
    title: 'Single digest and single normal step',
    steps: [DIGEST_10, EMAIL],
    expected: [[{ ...DIGEST_10, delay: TEN_MINS }, EMAIL]],
  },
  {
    title: 'Single digest, single delay and single normal step',
    steps: [DIGEST_5, DELAY_10, SMS],
    expected: [
      [
        { ...DIGEST_5, delay: FIVE_MINS },
        { ...SMS, delay: TEN_MINS },
      ],
    ],
  },
  {
    title: 'Inactive step at 5th position, skip 5,6,7',
    steps: [DIGEST_10, CHAT, EMAIL, SMS, CHAT_I, SMS, EMAIL],
    expected: [[{ ...DIGEST_10, delay: TEN_MINS }, CHAT, EMAIL, SMS]],
  },
  {
    title: 'Inactive step at last position, skip only last',
    steps: [DIGEST_5_BACKOFF, CHAT, EMAIL, SMS, EMAIL, SMS, CHAT_I],
    expected: [[{ ...DIGEST_5_BACKOFF, delay: FIVE_MINS }, CHAT, EMAIL, SMS, EMAIL, SMS]],
  },
  {
    title: 'Inactive step at first position after digest step, skip all except digest step',
    steps: [DIGEST_10, CHAT_I, EMAIL, SMS, EMAIL, SMS, CHAT_I],
    expected: [[{ ...DIGEST_5, delay: TEN_MINS }]],
  },
  {
    title: 'Two inactive steps',
    steps: [DIGEST_5, CHAT, EMAIL, SMS_I, EMAIL, SMS, CHAT_I],
    expected: [[{ ...DIGEST_5, delay: FIVE_MINS }, CHAT, EMAIL]],
  },
  {
    title: 'Digest step inactive',
    steps: [DIGEST_5_I, CHAT, EMAIL, IN_APP_I, EMAIL, SMS, CHAT_I],
    expected: [],
  },
  {
    title: 'Multiple digest steps',
    steps: [DIGEST_5, CHAT, EMAIL, PUSH, IN_APP, DIGEST_10, EMAIL, SMS, CHAT],
    expected: [
      [{ ...DIGEST_5, delay: FIVE_MINS }, CHAT, EMAIL, PUSH, IN_APP],
      [{ ...DIGEST_10, delay: TEN_MINS }, EMAIL, SMS, CHAT],
    ],
  },
  {
    title: 'Multiple digest steps with inactive steps',
    steps: [DIGEST_5, CHAT, EMAIL, PUSH_I, IN_APP, DIGEST_10, SMS, EMAIL_I, CHAT],
    expected: [
      [{ ...DIGEST_5, delay: FIVE_MINS }, CHAT, EMAIL],
      [{ ...DIGEST_10, delay: TEN_MINS }, SMS],
    ],
  },
  {
    title: 'Multiple digest steps with inactive digest steps',
    steps: [DIGEST_5, CHAT, EMAIL, PUSH_I, IN_APP, DIGEST_5_BACKOFF_I, SMS, EMAIL_I, CHAT],
    expected: [[{ ...DIGEST_5, delay: FIVE_MINS }, CHAT, EMAIL]],
  },
  {
    title: 'Single digest in the middle',
    steps: [CHAT, EMAIL, IN_APP, DIGEST_5, SMS, CHAT, PUSH],
    expected: [
      [CHAT, EMAIL, IN_APP],
      [{ ...DIGEST_5, delay: FIVE_MINS }, SMS, CHAT, PUSH],
    ],
  },
  {
    title: 'Multiple digest in the middle',
    steps: [CHAT, EMAIL, DIGEST_5, IN_APP, SMS, DIGEST_10, CHAT, PUSH],
    expected: [
      [CHAT, EMAIL],
      [{ ...DIGEST_5, delay: FIVE_MINS }, IN_APP, SMS],
      [{ ...DIGEST_10, delay: TEN_MINS }, CHAT, PUSH],
    ],
  },
  {
    title: 'Multiple delays with out digest steps',
    steps: [DELAY_5, CHAT, EMAIL, PUSH, , DELAY_10, SMS, EMAIL, CHAT],
    expected: [[{ ...CHAT, delay: FIVE_MINS }, EMAIL, PUSH, { ...SMS, delay: TEN_MINS }, EMAIL, CHAT]],
  },
  {
    title: 'delay with inactive steps',
    steps: [DELAY_5, CHAT, EMAIL, PUSH, DELAY_10, SMS_I, EMAIL, CHAT],
    expected: [[{ ...CHAT, delay: FIVE_MINS }, EMAIL, PUSH]],
  },
  {
    title: 'Inactive delay steps',
    steps: [DELAY_5, CHAT, EMAIL, PUSH, DELAY_10_I, SMS, EMAIL, CHAT],
    expected: [[{ ...CHAT, delay: FIVE_MINS }, EMAIL, PUSH]],
  },
  {
    title: 'Inactive delay path step',
    steps: [DELAY_5, CHAT, EMAIL, PUSH, DELAY_PATH_I, SMS, EMAIL, CHAT],
    expected: [[{ ...CHAT, delay: FIVE_MINS }, EMAIL, PUSH]],
  },
  {
    title: 'Delay last step',
    steps: [CHAT, EMAIL, PUSH, SMS, EMAIL, DELAY_5],
    expected: [[CHAT, EMAIL, PUSH, SMS, EMAIL]],
  },
  {
    title: 'Digest with delay steps',
    steps: [DIGEST_5, CHAT, EMAIL, PUSH, DELAY_10, SMS, CHAT, EMAIL_I],
    expected: [[{ ...DIGEST_5, delay: FIVE_MINS }, CHAT, EMAIL, PUSH, { ...SMS, delay: TEN_MINS }, CHAT]],
  },
  {
    title: 'Digest with delay path steps',
    payload: { [DELAY_PATH.metadata.delayPath]: DELAY_DATE },
    steps: [DIGEST_5, CHAT, EMAIL, PUSH, DELAY_PATH, SMS, CHAT, EMAIL],
    expected: [
      [{ ...DIGEST_5, delay: FIVE_MINS }, CHAT, EMAIL, PUSH],
      [{ ...SMS, delay: differenceInMilliseconds(new Date(DELAY_DATE), new Date()) }, CHAT, EMAIL],
    ],
  },
  {
    title: 'Digest with delay path nested steps',
    payload: { [DELAY_PATH_NESTED.metadata.delayPath]: DELAY_DATE },
    steps: [DIGEST_5, CHAT, EMAIL, PUSH, DELAY_PATH_NESTED, SMS, CHAT, EMAIL],
    expected: [
      [{ ...DIGEST_5, delay: FIVE_MINS }, CHAT, EMAIL, PUSH],
      [{ ...SMS, delay: differenceInMilliseconds(new Date(DELAY_DATE), new Date()) }, CHAT, EMAIL],
    ],
  },
  {
    title: 'Delay path at start with Digest steps',
    payload: { [DELAY_PATH.metadata.delayPath]: DELAY_DATE },
    steps: [DELAY_PATH, CHAT, EMAIL, DIGEST_5, PUSH, SMS, CHAT, EMAIL],
    expected: [
      [{ ...CHAT, delay: differenceInMilliseconds(new Date(DELAY_DATE), new Date()) }, EMAIL],
      [{ ...DIGEST_5, delay: FIVE_MINS }, PUSH, SMS, CHAT, EMAIL],
    ],
  },
  {
    title: 'Delay path not in metadata',
    steps: [DIGEST_5, CHAT, EMAIL, PUSH, DELAY_PATH_MISSING, SMS, CHAT, EMAIL],
    expected: new ApiException(),
  },
  {
    title: 'Delay path missing in payload',
    payload: { DUMMY: DELAY_DATE },
    steps: [DELAY_PATH, CHAT, EMAIL, DIGEST_5, PUSH, SMS, CHAT, EMAIL],
    expected: [
      [{ ...CHAT, delay: 0 }, EMAIL],
      [{ ...DIGEST_5, delay: FIVE_MINS }, PUSH, SMS, CHAT, EMAIL],
    ],
  },
  {
    title: 'Delay in front of digest step',
    steps: [EMAIL, IN_APP, DELAY_10, DIGEST_5, PUSH, SMS, CHAT, EMAIL],
    expected: [
      [EMAIL, IN_APP],
      [{ ...DIGEST_5, delay: FIVE_MINS }, PUSH, SMS, CHAT, EMAIL],
    ],
  },
  {
    title: 'Two consecutive delay steps',
    payload: { sendAt: DELAY_DATE },
    steps: [DIGEST_5, CHAT, EMAIL, PUSH, DELAY_5, DELAY_10, SMS, CHAT, EMAIL],
    expected: [
      [{ ...DIGEST_5, delay: FIVE_MINS }, CHAT, EMAIL, PUSH, { ...SMS, delay: FIVE_MINS + TEN_MINS }, CHAT, EMAIL],
    ],
  },
  {
    title: 'Two consecutive digest steps with delay',
    steps: [CHAT, EMAIL, PUSH, DIGEST_5, DIGEST_10, DELAY_5, SMS, CHAT, EMAIL],
    expected: [
      [CHAT, EMAIL, PUSH],
      [{ ...DIGEST_5, delay: FIVE_MINS }],
      [{ ...DIGEST_10, delay: TEN_MINS }, { ...SMS, delay: FIVE_MINS }, CHAT, EMAIL],
    ],
  },
  {
    title: 'Negative Delays in metadata',
    steps: [CHAT, PUSH, NEGATIVE_DELAY_5, EMAIL, DELAY_5, SMS, CHAT, EMAIL],
    expected: new ApiException(),
  },
  {
    title: 'Negative digest in metadata',
    steps: [CHAT, PUSH, NEGATIVE_DIGEST_5, EMAIL, DELAY_5, SMS, CHAT, EMAIL],
    expected: new ApiException(),
  },

  {
    title: 'Two Digests with overrides one delay',
    overrides: { delay: { amount: 10, unit: DigestUnitEnum.HOURS } },
    steps: [CHAT, EMAIL, PUSH, DIGEST_5, DIGEST_10, DELAY_5, SMS, CHAT, EMAIL],
    expected: [
      [CHAT, EMAIL, PUSH],
      [{ ...DIGEST_5, delay: FIVE_MINS }],
      [{ ...DIGEST_10, delay: TEN_MINS }, { ...SMS, delay: TEN_HOURS }, CHAT, EMAIL],
    ],
  },
  {
    title: 'Two Delays with overrides', //current behaviour is both delays overridden to single value, need to change?
    overrides: { delay: { amount: 5, unit: DigestUnitEnum.HOURS } },
    steps: [CHAT, DELAY_10, EMAIL, PUSH, DELAY_5, SMS, CHAT, EMAIL],
    expected: [[CHAT, { ...EMAIL, delay: FIVE_HOURS }, PUSH, { ...SMS, delay: FIVE_HOURS }, CHAT, EMAIL]],
  },
  {
    title: 'Negative Delays in overrides, should ignore negative delays',
    overrides: { delay: { amount: -5, unit: DigestUnitEnum.HOURS } },
    steps: [CHAT, DELAY_10, EMAIL, PUSH, DELAY_5, SMS, CHAT, EMAIL],
    expected: [[CHAT, { ...EMAIL, delay: TEN_MINS }, PUSH, { ...SMS, delay: FIVE_MINS }, CHAT, EMAIL]],
  },
];
