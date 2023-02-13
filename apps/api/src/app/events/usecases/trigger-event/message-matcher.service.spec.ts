import { expect } from 'chai';
import * as sinon from 'sinon';
import axios from 'axios';
import { Duration, sub } from 'date-fns';
import { FilterParts, FilterPartTypeEnum, FILTER_TO_LABEL, StepTypeEnum } from '@novu/shared';
import { JobEntity, MessageTemplateEntity, NotificationStepEntity, SubscriberRepository } from '@novu/dal';

import { MessageMatcher } from './message-matcher.service';
import type { SendMessageCommand } from '../send-message/send-message.command';

describe('Message filter matcher', function () {
  const createExecutionDetails = {
    execute: sinon.stub(),
  };
  let messageMatcher = new MessageMatcher(undefined as any, createExecutionDetails as any, undefined as any);

  it('should filter correct message by the filter value', async function () {
    const matchedMessage = await messageMatcher.filter(
      sendMessageCommand({
        step: makeStep('Correct Match', 'OR', [
          {
            operator: 'EQUAL',
            value: 'firstVar',
            field: 'varField',
            on: FilterPartTypeEnum.PAYLOAD,
          },
        ]),
      }),
      {
        payload: {
          varField: 'firstVar',
        },
      }
    );

    expect(matchedMessage.passed).to.equal(true);
  });

  it('should match a message for AND filter group', async function () {
    const matchedMessage = await messageMatcher.filter(
      sendMessageCommand({
        step: makeStep('Correct Match', 'AND', [
          {
            operator: 'EQUAL',
            value: 'firstVar',
            field: 'varField',
            on: FilterPartTypeEnum.PAYLOAD,
          },
          {
            operator: 'EQUAL',
            value: 'secondVar',
            field: 'secondField',
            on: FilterPartTypeEnum.PAYLOAD,
          },
        ]),
      }),
      {
        payload: {
          varField: 'firstVar',
          secondField: 'secondVar',
        },
      }
    );

    expect(matchedMessage.passed).to.equal(true);
  });

  it('should not match AND group for single bad item', async function () {
    const matchedMessage = await messageMatcher.filter(
      sendMessageCommand({
        step: makeStep('Title', 'AND', [
          {
            operator: 'EQUAL',
            value: 'firstVar',
            field: 'varField',
            on: FilterPartTypeEnum.PAYLOAD,
          },
          {
            operator: 'EQUAL',
            value: 'secondVar',
            field: 'secondField',
            on: FilterPartTypeEnum.PAYLOAD,
          },
        ]),
      }),
      {
        payload: {
          varField: 'firstVar',
          secondField: 'secondVarBad',
        },
      }
    );

    expect(matchedMessage.passed).to.equal(false);
  });

  it('should match a NOT_EQUAL for EQUAL var', async function () {
    const matchedMessage = await messageMatcher.filter(
      sendMessageCommand({
        step: makeStep('Correct Match', 'AND', [
          {
            operator: 'EQUAL',
            value: 'firstVar',
            field: 'varField',
            on: FilterPartTypeEnum.PAYLOAD,
          },
          {
            operator: 'NOT_EQUAL',
            value: 'secondVar',
            field: 'secondField',
            on: FilterPartTypeEnum.PAYLOAD,
          },
        ]),
      }),
      {
        payload: {
          varField: 'firstVar',
          secondField: 'secondVarBad',
        },
      }
    );

    expect(matchedMessage.passed).to.equal(true);
  });

  it('should match a EQUAL for a boolean var', async function () {
    const matchedMessage = await messageMatcher.filter(
      sendMessageCommand({
        step: makeStep('Correct Match', 'AND', [
          {
            operator: 'EQUAL',
            value: 'true',
            field: 'varField',
            on: FilterPartTypeEnum.PAYLOAD,
          },
        ]),
      }),
      {
        payload: {
          varField: true,
        },
      }
    );

    expect(matchedMessage.passed).to.equal(true);
  });

  it('should fall thru for no filters item', async function () {
    const matchedMessage = await messageMatcher.filter(
      sendMessageCommand({ step: makeStep('Correct Match 2', 'OR', []) }),
      {
        payload: {
          varField: 'firstVar',
          secondField: 'secondVarBad',
        },
      }
    );

    expect(matchedMessage.passed).to.equal(true);
  });

  it('should get larger payload var then filter value', async function () {
    const matchedMessage = await messageMatcher.filter(
      sendMessageCommand({
        step: makeStep('Correct Match', 'AND', [
          {
            operator: 'LARGER',
            value: '0',
            field: 'varField',
            on: FilterPartTypeEnum.PAYLOAD,
          },
        ]),
      }),
      {
        payload: {
          varField: 3,
        },
      }
    );

    expect(matchedMessage.passed).to.equal(true);
  });

  it('should get smaller payload var then filter value', async function () {
    const matchedMessage = await messageMatcher.filter(
      sendMessageCommand({
        step: makeStep('Correct Match', 'AND', [
          {
            operator: 'SMALLER',
            value: '3',
            field: 'varField',
            on: FilterPartTypeEnum.PAYLOAD,
          },
        ]),
      }),
      {
        payload: {
          varField: 0,
        },
      }
    );

    expect(matchedMessage.passed).to.equal(true);
  });

  it('should get larger or equal payload var then filter value', async function () {
    let matchedMessage = await messageMatcher.filter(
      sendMessageCommand({
        step: makeStep('Correct Match', 'AND', [
          {
            operator: 'LARGER_EQUAL',
            value: '0',
            field: 'varField',
            on: FilterPartTypeEnum.PAYLOAD,
          },
        ]),
      }),
      {
        payload: {
          varField: 3,
        },
      }
    );

    expect(matchedMessage.passed).to.equal(true);

    matchedMessage = await messageMatcher.filter(
      sendMessageCommand({
        step: makeStep('Correct Match', 'AND', [
          {
            operator: 'LARGER_EQUAL',
            value: '3',
            field: 'varField',
            on: FilterPartTypeEnum.PAYLOAD,
          },
        ]),
      }),
      {
        payload: {
          varField: 3,
        },
      }
    );

    expect(matchedMessage.passed).to.equal(true);
  });

  it('should get smaller or equal payload var then filter value', async function () {
    let matchedMessage = await messageMatcher.filter(
      sendMessageCommand({
        step: makeStep('Correct Match', 'AND', [
          {
            operator: 'SMALLER_EQUAL',
            value: '3',
            field: 'varField',
            on: FilterPartTypeEnum.PAYLOAD,
          },
        ]),
      }),
      {
        payload: {
          varField: 0,
        },
      }
    );

    expect(matchedMessage.passed).to.equal(true);

    matchedMessage = await messageMatcher.filter(
      sendMessageCommand({
        step: makeStep('Correct Match', 'AND', [
          {
            operator: 'SMALLER_EQUAL',
            value: '3',
            field: 'varField',
            on: FilterPartTypeEnum.PAYLOAD,
          },
        ]),
      }),
      {
        payload: {
          varField: 3,
        },
      }
    );

    expect(matchedMessage.passed).to.equal(true);
  });

  it('should handle now filters', async function () {
    let matchedMessage = await messageMatcher.filter(
      sendMessageCommand({
        step: {
          _templateId: '123',
          template: {
            subject: 'Test Subject',
            type: StepTypeEnum.EMAIL,
            name: '',
            content: 'Test',
            _organizationId: '123',
            _environmentId: 'asdas',
            _creatorId: '123',
          } as MessageTemplateEntity,
          filters: undefined,
        },
      }),
      {
        payload: {
          varField: 3,
        },
      }
    );
    expect(matchedMessage.passed).to.equal(true);

    matchedMessage = await messageMatcher.filter(
      sendMessageCommand({
        step: {
          _templateId: '123',
          template: {
            subject: 'Test Subject',
            type: StepTypeEnum.EMAIL,
            name: '',
            content: 'Test',
            _organizationId: '123',
            _environmentId: 'asdas',
            _creatorId: '123',
          } as MessageTemplateEntity,
          filters: [],
        },
      }),
      {
        payload: {
          varField: 3,
        },
      }
    );
    expect(matchedMessage.passed).to.equal(true);
    matchedMessage = await messageMatcher.filter(
      sendMessageCommand({
        step: {
          _templateId: '123',
          template: {
            subject: 'Test Subject',
            type: StepTypeEnum.EMAIL,
            name: '',
            content: 'Test',
            _organizationId: '123',
            _environmentId: 'asdas',
            _creatorId: '123',
          } as MessageTemplateEntity,
          filters: [
            {
              isNegated: false,
              type: 'GROUP',
              value: 'AND',
              children: [],
            },
          ],
        },
      }),
      {
        payload: {
          varField: 3,
        },
      }
    );
    expect(matchedMessage.passed).to.equal(true);
    matchedMessage = await messageMatcher.filter(
      sendMessageCommand({
        step: {
          _templateId: '123',
          template: {
            subject: 'Test Subject',
            type: StepTypeEnum.EMAIL,
            name: '',
            content: 'Test',
            _organizationId: '123',
            _environmentId: 'asdas',
            _creatorId: '123',
          } as MessageTemplateEntity,
          filters: [
            {
              isNegated: false,
              type: 'GROUP',
              value: 'AND',
              children: [],
            },
          ],
        },
      }),
      {
        payload: {
          varField: 3,
        },
      }
    );
    expect(matchedMessage.passed).to.equal(true);
  });

  it('should handle webhook filter', async function () {
    const gotGetStub = sinon.stub(axios, 'post').resolves(
      Promise.resolve({
        data: { varField: true },
      })
    );

    let matchedMessage = await messageMatcher.filter(
      sendMessageCommand({
        step: makeStep('Correct Match', undefined, [
          {
            operator: 'EQUAL',
            value: 'true',
            field: 'varField',
            on: FilterPartTypeEnum.WEBHOOK,
            webhookUrl: 'www.user.com/webhook',
          },
        ]),
      }),
      {
        payload: {},
      }
    );

    expect(matchedMessage.passed).to.equal(true);

    gotGetStub.restore();
  });

  it('should skip async filter if child under OR returned true', async function () {
    const gotGetStub = sinon.stub(axios, 'post').resolves(
      Promise.resolve({
        body: '{"varField":true}',
      })
    );

    let matchedMessage = await messageMatcher.filter(
      sendMessageCommand({
        step: makeStep('Correct Match', 'OR', [
          {
            operator: 'EQUAL',
            value: 'true',
            field: 'payloadVarField',
            on: FilterPartTypeEnum.PAYLOAD,
          },
          {
            operator: 'EQUAL',
            value: 'true',
            field: 'varField',
            on: FilterPartTypeEnum.WEBHOOK,
            webhookUrl: 'www.user.com/webhook',
          },
        ]),
      }),
      {
        payload: { payloadVarField: true },
      }
    );

    let requestsCount = gotGetStub.callCount;

    expect(requestsCount).to.equal(0);
    expect(matchedMessage.passed).to.equal(true);

    //Reorder children order to make sure it is not random

    matchedMessage = await messageMatcher.filter(
      sendMessageCommand({
        step: makeStep('Correct Match', 'OR', [
          {
            operator: 'EQUAL',
            value: 'true',
            field: 'varField',
            on: FilterPartTypeEnum.WEBHOOK,
            webhookUrl: 'www.user.com/webhook',
          },
          {
            operator: 'EQUAL',
            value: 'true',
            field: 'payloadVarField',
            on: FilterPartTypeEnum.PAYLOAD,
          },
        ]),
      }),
      {
        payload: { payloadVarField: true },
      }
    );

    requestsCount = gotGetStub.callCount;

    expect(requestsCount).to.equal(0);
    expect(matchedMessage.passed).to.equal(true);

    gotGetStub.restore();
  });

  it('should skip async filter if child under AND returned false', async function () {
    const gotGetStub = sinon.stub(axios, 'post').resolves(
      Promise.resolve({
        body: '{"varField":true}',
      })
    );

    let matchedMessage = await messageMatcher.filter(
      sendMessageCommand({
        step: makeStep('Correct Match', 'AND', [
          {
            operator: 'EQUAL',
            value: 'true',
            field: 'payloadVarField',
            on: FilterPartTypeEnum.PAYLOAD,
          },
          {
            operator: 'EQUAL',
            value: 'true',
            field: 'varField',
            on: FilterPartTypeEnum.WEBHOOK,
            webhookUrl: 'www.user.com/webhook',
          },
        ]),
      }),
      {
        payload: { payloadVarField: false },
      }
    );

    let requestsCount = gotGetStub.callCount;

    expect(requestsCount).to.equal(0);
    expect(matchedMessage.passed).to.equal(false);

    //Reorder children order to make sure it is not random

    matchedMessage = await messageMatcher.filter(
      sendMessageCommand({
        step: makeStep('Correct Match', 'AND', [
          {
            operator: 'EQUAL',
            value: 'true',
            field: 'varField',
            on: FilterPartTypeEnum.WEBHOOK,
            webhookUrl: 'www.user.com/webhook',
          },
          {
            operator: 'EQUAL',
            value: 'true',
            field: 'payloadVarField',
            on: FilterPartTypeEnum.PAYLOAD,
          },
        ]),
      }),
      {
        payload: { payloadVarField: false },
      }
    );

    requestsCount = gotGetStub.callCount;

    expect(requestsCount).to.equal(0);
    expect(matchedMessage.passed).to.equal(false);

    gotGetStub.restore();
  });

  describe('is online filters', () => {
    const getSubscriber = (
      { isOnline }: { isOnline?: boolean } = {},
      { subDuration }: { subDuration?: Duration } = {}
    ) => ({
      firstName: 'John',
      lastName: 'Doe',
      isOnline: isOnline ?? true,
      lastOnlineAt: subDuration ? sub(new Date(), subDuration).toISOString() : undefined,
    });

    describe('isOnline', () => {
      it('allows to process multiple filter parts', async () => {
        const matcher = new MessageMatcher(
          { findOne: () => Promise.resolve(getSubscriber()) } as any,
          createExecutionDetails as any,
          undefined as any
        );
        const matchedMessage = await matcher.filter(
          sendMessageCommand({
            step: makeStep('Correct Match', 'AND', [
              {
                on: FilterPartTypeEnum.IS_ONLINE,
                value: true,
              },
              {
                operator: 'EQUAL',
                value: 'true',
                field: 'payloadVarField',
                on: FilterPartTypeEnum.PAYLOAD,
              },
            ]),
          }),
          {
            payload: { payloadVarField: true },
          }
        );
        expect(matchedMessage.passed).to.equal(true);
      });

      it("doesn't allow to process if the subscriber has no online fields set and filter is true", async () => {
        const matcher = new MessageMatcher(
          {
            findOne: () =>
              Promise.resolve({
                firstName: 'John',
                lastName: 'Doe',
              }),
          } as any,
          createExecutionDetails as any,
          undefined as any
        );
        const matchedMessage = await matcher.filter(
          sendMessageCommand({
            step: makeStep('Correct Match', 'AND', [
              {
                on: FilterPartTypeEnum.IS_ONLINE,
                value: true,
              },
            ]),
          }),
          {
            payload: {},
          }
        );
        expect(matchedMessage.passed).to.equal(false);
      });

      it("doesn't allow to process if the subscriber has no online fields set and filter is false", async () => {
        const matcher = new MessageMatcher(
          {
            findOne: () =>
              Promise.resolve({
                firstName: 'John',
                lastName: 'Doe',
              }),
          } as any,
          createExecutionDetails as any,
          undefined as any
        );
        const matchedMessage = await matcher.filter(
          sendMessageCommand({
            step: makeStep('Correct Match', 'AND', [
              {
                on: FilterPartTypeEnum.IS_ONLINE,
                value: false,
              },
            ]),
          }),
          {
            payload: {},
          }
        );
        expect(matchedMessage.passed).to.equal(false);
      });

      it('allows to process if the subscriber is online', async () => {
        const matcher = new MessageMatcher(
          { findOne: () => Promise.resolve(getSubscriber()) } as any,
          createExecutionDetails as any,
          undefined as any
        );
        const matchedMessage = await matcher.filter(
          sendMessageCommand({
            step: makeStep('Correct Match', 'AND', [
              {
                on: FilterPartTypeEnum.IS_ONLINE,
                value: true,
              },
            ]),
          }),
          {
            payload: {},
          }
        );
        expect(matchedMessage.passed).to.equal(true);
      });

      it("doesn't allow to process if the subscriber is not online", async () => {
        const matcher = new MessageMatcher(
          { findOne: () => Promise.resolve(getSubscriber({ isOnline: false })) } as any,
          createExecutionDetails as any,
          undefined as any
        );
        const matchedMessage = await matcher.filter(
          sendMessageCommand({
            step: makeStep('Correct Match', 'AND', [
              {
                on: FilterPartTypeEnum.IS_ONLINE,
                value: true,
              },
            ]),
          }),
          {
            payload: {},
          }
        );
        expect(matchedMessage.passed).to.equal(false);
      });
    });

    describe('isOnlineInLast', () => {
      it('allows to process multiple filter parts', async () => {
        const matcher = new MessageMatcher(
          {
            findOne: () => Promise.resolve(getSubscriber({ isOnline: true }, { subDuration: { minutes: 3 } })),
          } as any,
          createExecutionDetails as any,
          undefined as any
        );
        const matchedMessage = await matcher.filter(
          sendMessageCommand({
            step: makeStep('Correct Match', 'AND', [
              {
                on: FilterPartTypeEnum.IS_ONLINE_IN_LAST,
                value: 5,
                timeOperator: 'minutes',
              },
              {
                operator: 'EQUAL',
                value: 'true',
                field: 'payloadVarField',
                on: FilterPartTypeEnum.PAYLOAD,
              },
            ]),
          }),
          {
            payload: { payloadVarField: true },
          }
        );
        expect(matchedMessage.passed).to.equal(true);
      });

      it("doesn't allow to process if the subscriber with no online fields set", async () => {
        const matcher = new MessageMatcher(
          {
            findOne: () =>
              Promise.resolve({
                firstName: 'John',
                lastName: 'Doe',
              }),
          } as any,
          createExecutionDetails as any,
          undefined as any
        );
        const matchedMessage = await matcher.filter(
          sendMessageCommand({
            step: makeStep('Correct Match', 'AND', [
              {
                on: FilterPartTypeEnum.IS_ONLINE_IN_LAST,
                value: 5,
                timeOperator: 'minutes',
              },
            ]),
          }),
          {
            payload: {},
          }
        );
        expect(matchedMessage.passed).to.equal(false);
      });

      it('allows to process if the subscriber is still online', async () => {
        const matcher = new MessageMatcher(
          {
            findOne: () => Promise.resolve(getSubscriber({ isOnline: true }, { subDuration: { minutes: 10 } })),
          } as any,
          createExecutionDetails as any,
          undefined as any
        );
        const matchedMessage = await matcher.filter(
          sendMessageCommand({
            step: makeStep('Correct Match', 'AND', [
              {
                on: FilterPartTypeEnum.IS_ONLINE_IN_LAST,
                value: 5,
                timeOperator: 'minutes',
              },
            ]),
          }),
          {
            payload: {},
          }
        );
        expect(matchedMessage.passed).to.equal(true);
      });

      it('allows to process if the subscriber was online in last 5 min', async () => {
        const matcher = new MessageMatcher(
          {
            findOne: () => Promise.resolve(getSubscriber({ isOnline: false }, { subDuration: { minutes: 4 } })),
          } as any,
          createExecutionDetails as any,
          undefined as any
        );
        const matchedMessage = await matcher.filter(
          sendMessageCommand({
            step: makeStep('Correct Match', 'AND', [
              {
                on: FilterPartTypeEnum.IS_ONLINE_IN_LAST,
                value: 5,
                timeOperator: 'minutes',
              },
            ]),
          }),
          {
            payload: {},
          }
        );
        expect(matchedMessage.passed).to.equal(true);
      });

      it("doesn't allow to process if the subscriber was online more that last 5 min", async () => {
        const matcher = new MessageMatcher(
          {
            findOne: () => Promise.resolve(getSubscriber({ isOnline: false }, { subDuration: { minutes: 6 } })),
          } as any,
          createExecutionDetails as any,
          undefined as any
        );
        const matchedMessage = await matcher.filter(
          sendMessageCommand({
            step: makeStep('Correct Match', 'AND', [
              {
                on: FilterPartTypeEnum.IS_ONLINE_IN_LAST,
                value: 5,
                timeOperator: 'minutes',
              },
            ]),
          }),
          {
            payload: {},
          }
        );
        expect(matchedMessage.passed).to.equal(false);
      });

      it('allows to process if the subscriber was online in last 1 hour', async () => {
        const matcher = new MessageMatcher(
          {
            findOne: () => Promise.resolve(getSubscriber({ isOnline: false }, { subDuration: { minutes: 30 } })),
          } as any,
          createExecutionDetails as any,
          undefined as any
        );
        const matchedMessage = await matcher.filter(
          sendMessageCommand({
            step: makeStep('Correct Match', 'AND', [
              {
                on: FilterPartTypeEnum.IS_ONLINE_IN_LAST,
                value: 1,
                timeOperator: 'hours',
              },
            ]),
          }),
          {
            payload: {},
          }
        );
        expect(matchedMessage.passed).to.equal(true);
      });

      it('allows to process if the subscriber was online in last 1 day', async () => {
        const matcher = new MessageMatcher(
          {
            findOne: () => Promise.resolve(getSubscriber({ isOnline: false }, { subDuration: { hours: 23 } })),
          } as any,
          createExecutionDetails as any,
          undefined as any
        );
        const matchedMessage = await matcher.filter(
          sendMessageCommand({
            step: makeStep('Correct Match', 'AND', [
              {
                on: FilterPartTypeEnum.IS_ONLINE_IN_LAST,
                value: 1,
                timeOperator: 'days',
              },
            ]),
          }),
          {
            payload: {},
          }
        );
        expect(matchedMessage.passed).to.equal(true);
      });
    });
  });

  describe('it summarize used filters based on condition', () => {
    it('should add a passed condition', () => {
      const result = MessageMatcher.sumFilters(
        {
          stepFilters: [],
          failedFilters: [],
          passedFilters: ['payload'],
        },
        {
          filter: FILTER_TO_LABEL.payload,
          field: '',
          expected: '',
          actual: '',
          operator: 'LARGER',
          passed: true,
        }
      );

      expect(result.passedFilters).to.contain('payload');
      expect(result.passedFilters.length).to.eq(1);
      expect(result.stepFilters.length).to.eq(1);
      expect(result.stepFilters).to.contain('payload');
    });

    it('should add a failed condition', () => {
      const result = MessageMatcher.sumFilters(
        {
          stepFilters: [],
          failedFilters: [],
          passedFilters: [],
        },
        {
          filter: FILTER_TO_LABEL.payload,
          field: '',
          expected: '',
          actual: '',
          operator: 'LARGER',
          passed: false,
        }
      );

      expect(result.failedFilters).to.contain('payload');
      expect(result.failedFilters.length).to.eq(1);
      expect(result.stepFilters.length).to.eq(1);
      expect(result.stepFilters).to.contain('payload');
    });

    it('should add online for both cases of online', () => {
      let result = MessageMatcher.sumFilters(
        {
          stepFilters: [],
          failedFilters: [],
          passedFilters: [],
        },
        {
          filter: FILTER_TO_LABEL.isOnlineInLast,
          field: '',
          expected: '',
          actual: '',
          operator: 'LARGER',
          passed: true,
        }
      );

      expect(result.passedFilters).to.contain('online');
      expect(result.passedFilters.length).to.eq(1);
      expect(result.stepFilters.length).to.eq(1);
      expect(result.stepFilters).to.contain('online');

      result = MessageMatcher.sumFilters(
        {
          stepFilters: [],
          failedFilters: [],
          passedFilters: [],
        },
        {
          filter: FILTER_TO_LABEL.isOnline,
          field: '',
          expected: '',
          actual: '',
          operator: 'LARGER',
          passed: true,
        }
      );

      expect(result.passedFilters).to.contain('online');
      expect(result.passedFilters.length).to.eq(1);
      expect(result.stepFilters.length).to.eq(1);
      expect(result.stepFilters).to.contain('online');
    });
  });
});

function makeStep(
  name: string,
  groupOperator: 'AND' | 'OR' = 'AND',
  filters: FilterParts[],
  channel = StepTypeEnum.EMAIL
): NotificationStepEntity {
  return {
    _templateId: '123',
    template: {
      subject: 'Test Subject',
      type: channel,
      name,
      content: 'Test',
      _organizationId: '123',
      _environmentId: 'asdas',
      _creatorId: '123',
    } as MessageTemplateEntity,
    filters: filters?.length
      ? [
          {
            isNegated: false,
            type: 'GROUP',
            value: groupOperator,
            children: filters,
          },
        ]
      : [],
  };
}

function sendMessageCommand({ step }: { step: NotificationStepEntity }): SendMessageCommand {
  return {
    identifier: '123',
    payload: {},
    overrides: {},
    step,
    environmentId: '123',
    organizationId: '123',
    userId: '123',
    transactionId: '123',
    notificationId: '123',
    subscriberId: '123',
    jobId: '123',
    job: {
      _notificationId: '123',
      transactionId: '123',
      _environmentId: '123',
      _organizationId: '123',
      _subscriberId: '123',
    } as JobEntity,
  };
}
