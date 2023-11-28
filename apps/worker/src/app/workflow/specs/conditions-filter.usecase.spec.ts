import { expect } from 'chai';
import * as sinon from 'sinon';
import axios from 'axios';
import { Duration, sub } from 'date-fns';
import {
  BuilderGroupValues,
  FieldLogicalOperatorEnum,
  FieldOperatorEnum,
  FilterParts,
  FilterPartTypeEnum,
  FILTER_TO_LABEL,
  StepTypeEnum,
  TimeOperatorEnum,
} from '@novu/shared';
import { JobEntity, MessageTemplateEntity, NotificationStepEntity } from '@novu/dal';
import { CompileTemplate, ConditionsFilter, ConditionsFilterCommand } from '@novu/application-generic';

describe('Message filter matcher', function () {
  const executionLogQueueService = {
    add: sinon.stub(),
  };
  const conditionsFilter = new ConditionsFilter(
    undefined as any,
    undefined as any,
    undefined as any,
    undefined as any,
    undefined as any,
    undefined as any,
    executionLogQueueService as any,
    new CompileTemplate()
  );

  it('should filter correct message by the filter value', async function () {
    const matchedMessage = await conditionsFilter.filter(
      mapConditionsFilterCommand({
        step: makeStep('Correct Match', FieldLogicalOperatorEnum.OR, [
          {
            operator: FieldOperatorEnum.EQUAL,
            value: 'firstVar',
            field: 'varField',
            on: FilterPartTypeEnum.PAYLOAD,
          },
        ]),
        variables: {
          payload: {
            varField: 'firstVar',
          },
        },
      })
    );

    expect(matchedMessage.passed).to.equal(true);
  });

  it('should filter correct message by the filter variable value', async function () {
    const matchedMessage = await conditionsFilter.filter(
      mapConditionsFilterCommand({
        step: makeStep('Correct Match', FieldLogicalOperatorEnum.OR, [
          {
            operator: FieldOperatorEnum.EQUAL,
            value: '{{payload.var}}',
            field: 'varField',
            on: FilterPartTypeEnum.PAYLOAD,
          },
        ]),
        variables: {
          payload: {
            varField: 'firstVar',
            var: 'firstVar',
          },
        },
      })
    );

    expect(matchedMessage.passed).to.equal(true);
  });

  it('should match a message for AND filter group', async function () {
    const matchedMessage = await conditionsFilter.filter(
      mapConditionsFilterCommand({
        step: makeStep('Correct Match', FieldLogicalOperatorEnum.AND, [
          {
            operator: FieldOperatorEnum.EQUAL,
            value: 'firstVar',
            field: 'varField',
            on: FilterPartTypeEnum.PAYLOAD,
          },
          {
            operator: FieldOperatorEnum.EQUAL,
            value: 'secondVar',
            field: 'secondField',
            on: FilterPartTypeEnum.PAYLOAD,
          },
        ]),
        variables: {
          payload: {
            varField: 'firstVar',
            secondField: 'secondVar',
          },
        },
      })
    );

    expect(matchedMessage.passed).to.equal(true);
  });

  it('should not match AND group for single bad item', async function () {
    const matchedMessage = await conditionsFilter.filter(
      mapConditionsFilterCommand({
        step: makeStep('Title', FieldLogicalOperatorEnum.AND, [
          {
            operator: FieldOperatorEnum.EQUAL,
            value: 'firstVar',
            field: 'varField',
            on: FilterPartTypeEnum.PAYLOAD,
          },
          {
            operator: FieldOperatorEnum.EQUAL,
            value: 'secondVar',
            field: 'secondField',
            on: FilterPartTypeEnum.PAYLOAD,
          },
        ]),
        variables: {
          payload: {
            varField: 'firstVar',
            secondField: 'secondVarBad',
          },
        },
      })
    );

    expect(matchedMessage.passed).to.equal(false);
  });

  it('should match a NOT_EQUAL for EQUAL var', async function () {
    const matchedMessage = await conditionsFilter.filter(
      mapConditionsFilterCommand({
        step: makeStep('Correct Match', FieldLogicalOperatorEnum.AND, [
          {
            operator: FieldOperatorEnum.EQUAL,
            value: 'firstVar',
            field: 'varField',
            on: FilterPartTypeEnum.PAYLOAD,
          },
          {
            operator: FieldOperatorEnum.NOT_EQUAL,
            value: 'secondVar',
            field: 'secondField',
            on: FilterPartTypeEnum.PAYLOAD,
          },
        ]),
        variables: {
          payload: {
            varField: 'firstVar',
            secondField: 'secondVarBad',
          },
        },
      })
    );

    expect(matchedMessage.passed).to.equal(true);
  });

  it('should match a EQUAL for a boolean var', async function () {
    const matchedMessage = await conditionsFilter.filter(
      mapConditionsFilterCommand({
        step: makeStep('Correct Match', FieldLogicalOperatorEnum.AND, [
          {
            operator: FieldOperatorEnum.EQUAL,
            value: 'true',
            field: 'varField',
            on: FilterPartTypeEnum.PAYLOAD,
          },
        ]),
        variables: {
          payload: {
            varField: true,
          },
        },
      })
    );

    expect(matchedMessage.passed).to.equal(true);
  });

  it('should fall thru for no filters item', async function () {
    const matchedMessage = await conditionsFilter.filter(
      mapConditionsFilterCommand({
        step: makeStep('Correct Match 2', FieldLogicalOperatorEnum.OR, []),
        variables: {
          payload: {
            varField: 'firstVar',
            secondField: 'secondVarBad',
          },
        },
      })
    );

    expect(matchedMessage.passed).to.equal(true);
  });

  it('should get larger payload var then filter value', async function () {
    const matchedMessage = await conditionsFilter.filter(
      mapConditionsFilterCommand({
        step: makeStep('Correct Match', FieldLogicalOperatorEnum.AND, [
          {
            operator: FieldOperatorEnum.LARGER,
            value: '0',
            field: 'varField',
            on: FilterPartTypeEnum.PAYLOAD,
          },
        ]),
        variables: {
          payload: {
            varField: 3,
          },
        },
      })
    );

    expect(matchedMessage.passed).to.equal(true);
  });

  it('should get smaller payload var then filter value', async function () {
    const matchedMessage = await conditionsFilter.filter(
      mapConditionsFilterCommand({
        step: makeStep('Correct Match', FieldLogicalOperatorEnum.AND, [
          {
            operator: FieldOperatorEnum.SMALLER,
            value: '3',
            field: 'varField',
            on: FilterPartTypeEnum.PAYLOAD,
          },
        ]),
        variables: {
          payload: {
            varField: 0,
          },
        },
      })
    );

    expect(matchedMessage.passed).to.equal(true);
  });

  it('should get larger or equal payload var then filter value', async function () {
    let matchedMessage = await conditionsFilter.filter(
      mapConditionsFilterCommand({
        step: makeStep('Correct Match', FieldLogicalOperatorEnum.AND, [
          {
            operator: FieldOperatorEnum.LARGER_EQUAL,
            value: '0',
            field: 'varField',
            on: FilterPartTypeEnum.PAYLOAD,
          },
        ]),
        variables: {
          payload: {
            varField: 3,
          },
        },
      })
    );

    expect(matchedMessage.passed).to.equal(true);

    matchedMessage = await conditionsFilter.filter(
      mapConditionsFilterCommand({
        step: makeStep('Correct Match', FieldLogicalOperatorEnum.AND, [
          {
            operator: FieldOperatorEnum.LARGER_EQUAL,
            value: '3',
            field: 'varField',
            on: FilterPartTypeEnum.PAYLOAD,
          },
        ]),
        variables: {
          payload: {
            varField: 3,
          },
        },
      })
    );

    expect(matchedMessage.passed).to.equal(true);
  });
  it('should check if value is defined in payload', async function () {
    const matchedMessage = await conditionsFilter.filter(
      mapConditionsFilterCommand({
        step: makeStep('Correct Match', FieldLogicalOperatorEnum.AND, [
          {
            operator: FieldOperatorEnum.IS_DEFINED,
            value: '',
            field: 'emailMessage',
            on: FilterPartTypeEnum.PAYLOAD,
          },
        ]),
        variables: {
          payload: {
            emailMessage: '<b>This works</b>',
          },
        },
      })
    );

    expect(matchedMessage.passed).to.equal(true);
  });

  it('should check if key is defined or not in subscriber data', async function () {
    const matchedMessage = await conditionsFilter.filter(
      mapConditionsFilterCommand({
        step: makeStep('Correct Match', FieldLogicalOperatorEnum.AND, [
          {
            operator: FieldOperatorEnum.IS_DEFINED,
            value: '',
            field: 'data.nestedKey',
            on: FilterPartTypeEnum.SUBSCRIBER,
          },
        ]),
        variables: {
          subscriber: {
            firstName: '',
            lastName: '',
            email: '',
            subscriberId: '',
            deleted: false,
            createdAt: '',
            updatedAt: '',
            _id: '',
            _organizationId: '',
            _environmentId: '',
            data: {
              nested_Key: 'nestedValue',
            },
          },
        },
      })
    );

    expect(matchedMessage.passed).to.equal(false);
  });

  it('should get nested custom subscriber data', async function () {
    const matchedMessage = await conditionsFilter.filter(
      mapConditionsFilterCommand({
        step: makeStep('Correct Match', FieldLogicalOperatorEnum.OR, [
          {
            operator: FieldOperatorEnum.EQUAL,
            value: 'nestedValue',
            field: 'data.nestedKey',
            on: FilterPartTypeEnum.SUBSCRIBER,
          },
        ]),
        variables: {
          subscriber: {
            firstName: '',
            lastName: '',
            email: '',
            subscriberId: '',
            deleted: false,
            createdAt: '',
            updatedAt: '',
            _id: '',
            _organizationId: '',
            _environmentId: '',
            data: {
              nestedKey: 'nestedValue',
            },
          },
        },
      })
    );

    expect(matchedMessage.passed).to.equal(true);
  });

  it("should return false with nested data that doesn't exist", async function () {
    const matchedMessage = await conditionsFilter.filter(
      mapConditionsFilterCommand({
        step: makeStep('Correct Match', FieldLogicalOperatorEnum.OR, [
          {
            operator: FieldOperatorEnum.EQUAL,
            value: 'nestedValue',
            field: 'data.nestedKey.doesNotExist',
            on: FilterPartTypeEnum.PAYLOAD,
          },
        ]),
        variables: {
          payload: {
            data: {
              nestedKey: {
                childKey: 'nestedValue',
              },
            },
          },
        },
      })
    );

    expect(matchedMessage.passed).to.equal(false);
  });

  it('should get smaller or equal payload var then filter value', async function () {
    let matchedMessage = await conditionsFilter.filter(
      mapConditionsFilterCommand({
        step: makeStep('Correct Match', FieldLogicalOperatorEnum.AND, [
          {
            operator: FieldOperatorEnum.SMALLER_EQUAL,
            value: '3',
            field: 'varField',
            on: FilterPartTypeEnum.PAYLOAD,
          },
        ]),
        variables: {
          payload: {
            varField: 0,
          },
        },
      })
    );

    expect(matchedMessage.passed).to.equal(true);

    matchedMessage = await conditionsFilter.filter(
      mapConditionsFilterCommand({
        step: makeStep('Correct Match', FieldLogicalOperatorEnum.AND, [
          {
            operator: FieldOperatorEnum.SMALLER_EQUAL,
            value: '3',
            field: 'varField',
            on: FilterPartTypeEnum.PAYLOAD,
          },
        ]),
        variables: {
          payload: {
            varField: 3,
          },
        },
      })
    );

    expect(matchedMessage.passed).to.equal(true);
  });

  it('should handle now filters', async function () {
    let matchedMessage = await conditionsFilter.filter(
      mapConditionsFilterCommand({
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
        variables: {
          payload: {
            varField: 3,
          },
        },
      })
    );

    expect(matchedMessage.passed).to.equal(true);

    matchedMessage = await conditionsFilter.filter(
      mapConditionsFilterCommand({
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
        variables: {
          payload: {
            varField: 3,
          },
        },
      })
    );

    expect(matchedMessage.passed).to.equal(true);
    matchedMessage = await conditionsFilter.filter(
      mapConditionsFilterCommand({
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
              value: FieldLogicalOperatorEnum.AND,
              children: [],
            },
          ],
        },
        variables: {
          payload: {
            varField: 3,
          },
        },
      })
    );

    expect(matchedMessage.passed).to.equal(true);
    matchedMessage = await conditionsFilter.filter(
      mapConditionsFilterCommand({
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
              value: FieldLogicalOperatorEnum.AND,
              children: [],
            },
          ],
        },
        variables: {
          payload: {
            varField: 3,
          },
        },
      })
    );

    expect(matchedMessage.passed).to.equal(true);
  });

  it('should handle webhook filter', async function () {
    const gotGetStub = sinon.stub(axios, 'post').resolves(
      Promise.resolve({
        data: { varField: true },
      })
    );

    const matchedMessage = await conditionsFilter.filter(
      mapConditionsFilterCommand({
        step: makeStep('Correct Match', undefined, [
          {
            operator: FieldOperatorEnum.EQUAL,
            value: 'true',
            field: 'varField',
            on: FilterPartTypeEnum.WEBHOOK,
            webhookUrl: 'www.user.com/webhook',
          },
        ]),
        variables: { payload: {} },
      })
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

    let matchedMessage = await conditionsFilter.filter(
      mapConditionsFilterCommand({
        step: makeStep('Correct Match', FieldLogicalOperatorEnum.OR, [
          {
            operator: FieldOperatorEnum.EQUAL,
            value: 'true',
            field: 'payloadVarField',
            on: FilterPartTypeEnum.PAYLOAD,
          },
          {
            operator: FieldOperatorEnum.EQUAL,
            value: 'true',
            field: 'varField',
            on: FilterPartTypeEnum.WEBHOOK,
            webhookUrl: 'www.user.com/webhook',
          },
        ]),
        variables: { payload: { payloadVarField: true } },
      })
    );

    let requestsCount = gotGetStub.callCount;

    expect(requestsCount).to.equal(0);
    expect(matchedMessage.passed).to.equal(true);

    //Reorder children order to make sure it is not random

    matchedMessage = await conditionsFilter.filter(
      mapConditionsFilterCommand({
        step: makeStep('Correct Match', FieldLogicalOperatorEnum.OR, [
          {
            operator: FieldOperatorEnum.EQUAL,
            value: 'true',
            field: 'varField',
            on: FilterPartTypeEnum.WEBHOOK,
            webhookUrl: 'www.user.com/webhook',
          },
          {
            operator: FieldOperatorEnum.EQUAL,
            value: 'true',
            field: 'payloadVarField',
            on: FilterPartTypeEnum.PAYLOAD,
          },
        ]),
        variables: { payload: { payloadVarField: true } },
      })
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

    let matchedMessage = await conditionsFilter.filter(
      mapConditionsFilterCommand({
        step: makeStep('Correct Match', FieldLogicalOperatorEnum.AND, [
          {
            operator: FieldOperatorEnum.EQUAL,
            value: 'true',
            field: 'payloadVarField',
            on: FilterPartTypeEnum.PAYLOAD,
          },
          {
            operator: FieldOperatorEnum.EQUAL,
            value: 'true',
            field: 'varField',
            on: FilterPartTypeEnum.WEBHOOK,
            webhookUrl: 'www.user.com/webhook',
          },
        ]),
        variables: { payload: { payloadVarField: false } },
      })
    );

    let requestsCount = gotGetStub.callCount;

    expect(requestsCount).to.equal(0);
    expect(matchedMessage.passed).to.equal(false);

    //Reorder children order to make sure it is not random

    matchedMessage = await conditionsFilter.filter(
      mapConditionsFilterCommand({
        step: makeStep('Correct Match', FieldLogicalOperatorEnum.AND, [
          {
            operator: FieldOperatorEnum.EQUAL,
            value: 'true',
            field: 'varField',
            on: FilterPartTypeEnum.WEBHOOK,
            webhookUrl: 'www.user.com/webhook',
          },
          {
            operator: FieldOperatorEnum.EQUAL,
            value: 'true',
            field: 'payloadVarField',
            on: FilterPartTypeEnum.PAYLOAD,
          },
        ]),
        variables: { payload: { payloadVarField: false } },
      })
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
        const filter = new ConditionsFilter(
          { findOne: () => Promise.resolve(getSubscriber()) } as any,
          undefined as any,
          undefined as any,
          undefined as any,
          undefined as any,
          undefined as any,
          executionLogQueueService as any,
          new CompileTemplate()
        );
        const matchedMessage = await filter.filter(
          mapConditionsFilterCommand({
            step: makeStep('Correct Match', FieldLogicalOperatorEnum.AND, [
              {
                on: FilterPartTypeEnum.IS_ONLINE,
                value: true,
              },
              {
                operator: FieldOperatorEnum.EQUAL,
                value: 'true',
                field: 'payloadVarField',
                on: FilterPartTypeEnum.PAYLOAD,
              },
            ]),
            variables: { payload: { payloadVarField: true } },
          })
        );

        expect(matchedMessage.passed).to.equal(true);
      });

      it("doesn't allow to process if the subscriber has no online fields set and filter is true", async () => {
        const filter = new ConditionsFilter(
          {
            findOne: () =>
              Promise.resolve({
                firstName: 'John',
                lastName: 'Doe',
              }),
          } as any,
          undefined as any,
          undefined as any,
          undefined as any,
          undefined as any,
          undefined as any,
          executionLogQueueService as any,
          new CompileTemplate()
        );
        const matchedMessage = await filter.filter(
          mapConditionsFilterCommand({
            step: makeStep('Correct Match', FieldLogicalOperatorEnum.AND, [
              {
                on: FilterPartTypeEnum.IS_ONLINE,
                value: true,
              },
            ]),
            variables: { payload: {} },
          })
        );

        expect(matchedMessage.passed).to.equal(false);
      });

      it("doesn't allow to process if the subscriber has no online fields set and filter is false", async () => {
        const filter = new ConditionsFilter(
          {
            findOne: () =>
              Promise.resolve({
                firstName: 'John',
                lastName: 'Doe',
              }),
          } as any,
          undefined as any,
          undefined as any,
          undefined as any,
          undefined as any,
          undefined as any,
          executionLogQueueService as any,
          new CompileTemplate()
        );
        const matchedMessage = await filter.filter(
          mapConditionsFilterCommand({
            step: makeStep('Correct Match', FieldLogicalOperatorEnum.AND, [
              {
                on: FilterPartTypeEnum.IS_ONLINE,
                value: false,
              },
            ]),
            variables: { payload: {} },
          })
        );

        expect(matchedMessage.passed).to.equal(false);
      });

      it('allows to process if the subscriber is online', async () => {
        const filter = new ConditionsFilter(
          { findOne: () => Promise.resolve(getSubscriber()) } as any,
          undefined as any,
          undefined as any,
          undefined as any,
          undefined as any,
          undefined as any,
          executionLogQueueService as any,
          new CompileTemplate()
        );
        const matchedMessage = await filter.filter(
          mapConditionsFilterCommand({
            step: makeStep('Correct Match', FieldLogicalOperatorEnum.AND, [
              {
                on: FilterPartTypeEnum.IS_ONLINE,
                value: true,
              },
            ]),
            variables: { payload: {} },
          })
        );

        expect(matchedMessage.passed).to.equal(true);
      });

      it("doesn't allow to process if the subscriber is not online", async () => {
        const filter = new ConditionsFilter(
          { findOne: () => Promise.resolve(getSubscriber({ isOnline: false })) } as any,
          undefined as any,
          undefined as any,
          undefined as any,
          undefined as any,
          undefined as any,
          executionLogQueueService as any,
          new CompileTemplate()
        );
        const matchedMessage = await filter.filter(
          mapConditionsFilterCommand({
            step: makeStep('Correct Match', FieldLogicalOperatorEnum.AND, [
              {
                on: FilterPartTypeEnum.IS_ONLINE,
                value: true,
              },
            ]),
            variables: { payload: {} },
          })
        );

        expect(matchedMessage.passed).to.equal(false);
      });
    });

    describe('isOnlineInLast', () => {
      it('allows to process multiple filter parts', async () => {
        const filter = new ConditionsFilter(
          {
            findOne: () => Promise.resolve(getSubscriber({ isOnline: true }, { subDuration: { minutes: 3 } })),
          } as any,
          undefined as any,
          undefined as any,
          undefined as any,
          undefined as any,
          undefined as any,
          executionLogQueueService as any,
          new CompileTemplate()
        );
        const matchedMessage = await filter.filter(
          mapConditionsFilterCommand({
            step: makeStep('Correct Match', FieldLogicalOperatorEnum.AND, [
              {
                on: FilterPartTypeEnum.IS_ONLINE_IN_LAST,
                value: 5,
                timeOperator: TimeOperatorEnum.MINUTES,
              },
              {
                operator: FieldOperatorEnum.EQUAL,
                value: 'true',
                field: 'payloadVarField',
                on: FilterPartTypeEnum.PAYLOAD,
              },
            ]),
            variables: { payload: { payloadVarField: true } },
          })
        );

        expect(matchedMessage.passed).to.equal(true);
      });

      it("doesn't allow to process if the subscriber with no online fields set", async () => {
        const filter = new ConditionsFilter(
          {
            findOne: () =>
              Promise.resolve({
                firstName: 'John',
                lastName: 'Doe',
              }),
          } as any,
          undefined as any,
          undefined as any,
          undefined as any,
          undefined as any,
          undefined as any,
          executionLogQueueService as any,
          new CompileTemplate()
        );
        const matchedMessage = await filter.filter(
          mapConditionsFilterCommand({
            step: makeStep('Correct Match', FieldLogicalOperatorEnum.AND, [
              {
                on: FilterPartTypeEnum.IS_ONLINE_IN_LAST,
                value: 5,
                timeOperator: TimeOperatorEnum.MINUTES,
              },
            ]),
            variables: { payload: {} },
          })
        );

        expect(matchedMessage.passed).to.equal(false);
      });

      it('allows to process if the subscriber is still online', async () => {
        const filter = new ConditionsFilter(
          {
            findOne: () => Promise.resolve(getSubscriber({ isOnline: true }, { subDuration: { minutes: 10 } })),
          } as any,
          undefined as any,
          undefined as any,
          undefined as any,
          undefined as any,
          undefined as any,
          executionLogQueueService as any,
          new CompileTemplate()
        );
        const matchedMessage = await filter.filter(
          mapConditionsFilterCommand({
            step: makeStep('Correct Match', FieldLogicalOperatorEnum.AND, [
              {
                on: FilterPartTypeEnum.IS_ONLINE_IN_LAST,
                value: 5,
                timeOperator: TimeOperatorEnum.MINUTES,
              },
            ]),
            variables: { payload: {} },
          })
        );

        expect(matchedMessage.passed).to.equal(true);
      });

      it('allows to process if the subscriber was online in last 5 min', async () => {
        const filter = new ConditionsFilter(
          {
            findOne: () => Promise.resolve(getSubscriber({ isOnline: false }, { subDuration: { minutes: 4 } })),
          } as any,
          undefined as any,
          undefined as any,
          undefined as any,
          undefined as any,
          undefined as any,
          executionLogQueueService as any,
          new CompileTemplate()
        );
        const matchedMessage = await filter.filter(
          mapConditionsFilterCommand({
            step: makeStep('Correct Match', FieldLogicalOperatorEnum.AND, [
              {
                on: FilterPartTypeEnum.IS_ONLINE_IN_LAST,
                value: 5,
                timeOperator: TimeOperatorEnum.MINUTES,
              },
            ]),
            variables: { payload: {} },
          })
        );

        expect(matchedMessage.passed).to.equal(true);
      });

      it("doesn't allow to process if the subscriber was online more that last 5 min", async () => {
        const filter = new ConditionsFilter(
          {
            findOne: () => Promise.resolve(getSubscriber({ isOnline: false }, { subDuration: { minutes: 6 } })),
          } as any,
          undefined as any,
          undefined as any,
          undefined as any,
          undefined as any,
          undefined as any,
          executionLogQueueService as any,
          new CompileTemplate()
        );
        const matchedMessage = await filter.filter(
          mapConditionsFilterCommand({
            step: makeStep('Correct Match', FieldLogicalOperatorEnum.AND, [
              {
                on: FilterPartTypeEnum.IS_ONLINE_IN_LAST,
                value: 5,
                timeOperator: TimeOperatorEnum.MINUTES,
              },
            ]),
            variables: { payload: {} },
          })
        );

        expect(matchedMessage.passed).to.equal(false);
      });

      it('allows to process if the subscriber was online in last 1 hour', async () => {
        const filter = new ConditionsFilter(
          {
            findOne: () => Promise.resolve(getSubscriber({ isOnline: false }, { subDuration: { minutes: 30 } })),
          } as any,
          undefined as any,
          undefined as any,
          undefined as any,
          undefined as any,
          undefined as any,
          executionLogQueueService as any,
          new CompileTemplate()
        );
        const matchedMessage = await filter.filter(
          mapConditionsFilterCommand({
            step: makeStep('Correct Match', FieldLogicalOperatorEnum.AND, [
              {
                on: FilterPartTypeEnum.IS_ONLINE_IN_LAST,
                value: 1,
                timeOperator: TimeOperatorEnum.HOURS,
              },
            ]),
            variables: { payload: {} },
          })
        );

        expect(matchedMessage.passed).to.equal(true);
      });

      it('allows to process if the subscriber was online in last 1 day', async () => {
        const filter = new ConditionsFilter(
          {
            findOne: () => Promise.resolve(getSubscriber({ isOnline: false }, { subDuration: { hours: 23 } })),
          } as any,
          undefined as any,
          undefined as any,
          undefined as any,
          undefined as any,
          undefined as any,
          executionLogQueueService as any,
          new CompileTemplate()
        );
        const matchedMessage = await filter.filter(
          mapConditionsFilterCommand({
            step: makeStep('Correct Match', FieldLogicalOperatorEnum.AND, [
              {
                on: FilterPartTypeEnum.IS_ONLINE_IN_LAST,
                value: 1,
                timeOperator: TimeOperatorEnum.DAYS,
              },
            ]),
            variables: { payload: {} },
          })
        );

        expect(matchedMessage.passed).to.equal(true);
      });
    });
  });

  describe('it summarize used filters based on condition', () => {
    it('should add a passed condition', () => {
      const result = ConditionsFilter.sumFilters(
        {
          filters: [],
          failedFilters: [],
          passedFilters: ['payload'],
        },
        {
          filter: FILTER_TO_LABEL.payload,
          field: '',
          expected: '',
          actual: '',
          operator: FieldOperatorEnum.LARGER,
          passed: true,
        }
      );

      expect(result.passedFilters).to.contain('payload');
      expect(result.passedFilters.length).to.eq(1);
      expect(result.filters.length).to.eq(1);
      expect(result.filters).to.contain('payload');
    });

    it('should add a failed condition', () => {
      const result = ConditionsFilter.sumFilters(
        {
          filters: [],
          failedFilters: [],
          passedFilters: [],
        },
        {
          filter: FILTER_TO_LABEL.payload,
          field: '',
          expected: '',
          actual: '',
          operator: FieldOperatorEnum.LARGER,
          passed: false,
        }
      );

      expect(result.failedFilters).to.contain('payload');
      expect(result.failedFilters.length).to.eq(1);
      expect(result.filters.length).to.eq(1);
      expect(result.filters).to.contain('payload');
    });

    it('should add online for both cases of online', () => {
      let result = ConditionsFilter.sumFilters(
        {
          filters: [],
          failedFilters: [],
          passedFilters: [],
        },
        {
          filter: FILTER_TO_LABEL.isOnlineInLast,
          field: '',
          expected: '',
          actual: '',
          operator: FieldOperatorEnum.LARGER,
          passed: true,
        }
      );

      expect(result.passedFilters).to.contain('online');
      expect(result.passedFilters.length).to.eq(1);
      expect(result.filters.length).to.eq(1);
      expect(result.filters).to.contain('online');

      result = ConditionsFilter.sumFilters(
        {
          filters: [],
          failedFilters: [],
          passedFilters: [],
        },
        {
          filter: FILTER_TO_LABEL.isOnline,
          field: '',
          expected: '',
          actual: '',
          operator: FieldOperatorEnum.LARGER,
          passed: true,
        }
      );

      expect(result.passedFilters).to.contain('online');
      expect(result.passedFilters.length).to.eq(1);
      expect(result.filters.length).to.eq(1);
      expect(result.filters).to.contain('online');
    });
  });
});

function makeStep(
  name: string,
  groupOperator: BuilderGroupValues = FieldLogicalOperatorEnum.AND,
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

function mapConditionsFilterCommand({
  step,
  variables,
}: {
  step: NotificationStepEntity;
  variables?: any;
}): ConditionsFilterCommand {
  return {
    variables: { ...(variables || {}) },
    filters: [],
    step,
    environmentId: '123',
    organizationId: '123',
    userId: '123',
    job: {
      _notificationId: '123',
      transactionId: '123',
      _environmentId: '123',
      _organizationId: '123',
      _subscriberId: '123',
      subscriberId: '1234',
    } as JobEntity,
  };
}
