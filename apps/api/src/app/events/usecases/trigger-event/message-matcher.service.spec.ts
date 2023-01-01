import { BuilderFieldOperator, StepTypeEnum } from '@novu/shared';
import { expect } from 'chai';
import { NotificationStepEntity } from '@novu/dal';
import * as sinon from 'sinon';
import { MessageMatcher } from './message-matcher.service';
import axios from 'axios';

describe('Message filter matcher', function () {
  let messageMatcher = new MessageMatcher(undefined, undefined, undefined);

  it('should filter correct message by the filter value', async function () {
    const matchedMessage = await messageMatcher.filter(
      messageWrapper('Correct Match', 'OR', [
        {
          operator: 'EQUAL',
          value: 'firstVar',
          field: 'varField',
          on: 'payload',
        },
      ]),
      {
        payload: {
          varField: 'firstVar',
        },
      }
    );

    expect(matchedMessage).to.equal(true);
  });

  it('should match a message for AND filter group', async function () {
    const matchedMessage = await messageMatcher.filter(
      messageWrapper('Correct Match', 'AND', [
        {
          operator: 'EQUAL',
          value: 'firstVar',
          field: 'varField',
          on: 'payload',
        },
        {
          operator: 'EQUAL',
          value: 'secondVar',
          field: 'secondField',
          on: 'payload',
        },
      ]),
      {
        payload: {
          varField: 'firstVar',
          secondField: 'secondVar',
        },
      }
    );

    expect(matchedMessage).to.equal(true);
  });

  it('should not match AND group for single bad item', async function () {
    const matchedMessage = await messageMatcher.filter(
      messageWrapper('Title', 'AND', [
        {
          operator: 'EQUAL',
          value: 'firstVar',
          field: 'varField',
          on: 'payload',
        },
        {
          operator: 'EQUAL',
          value: 'secondVar',
          field: 'secondField',
          on: 'payload',
        },
      ]),
      {
        payload: {
          varField: 'firstVar',
          secondField: 'secondVarBad',
        },
      }
    );

    expect(matchedMessage).to.equal(false);
  });

  it('should match a NOT_EQUAL for EQUAL var', async function () {
    const matchedMessage = await messageMatcher.filter(
      messageWrapper('Correct Match', 'AND', [
        {
          operator: 'EQUAL',
          value: 'firstVar',
          field: 'varField',
          on: 'payload',
        },
        {
          operator: 'NOT_EQUAL',
          value: 'secondVar',
          field: 'secondField',
          on: 'payload',
        },
      ]),
      {
        payload: {
          varField: 'firstVar',
          secondField: 'secondVarBad',
        },
      }
    );

    expect(matchedMessage).to.equal(true);
  });

  it('should match a EQUAL for a boolean var', async function () {
    const matchedMessage = await messageMatcher.filter(
      messageWrapper('Correct Match', 'AND', [
        {
          operator: 'EQUAL',
          value: 'true',
          field: 'varField',
          on: 'payload',
        },
      ]),
      {
        payload: {
          varField: true,
        },
      }
    );

    expect(matchedMessage).to.equal(true);
  });

  it('should fall thru for no filters item', async function () {
    const matchedMessage = await messageMatcher.filter(messageWrapper('Correct Match 2', 'OR', []), {
      payload: {
        varField: 'firstVar',
        secondField: 'secondVarBad',
      },
    });

    expect(matchedMessage).to.equal(true);
  });

  it('should get larger payload var then filter value', async function () {
    const matchedMessage = await messageMatcher.filter(
      messageWrapper('Correct Match', 'AND', [
        {
          operator: 'LARGER',
          value: '0',
          field: 'varField',
          on: 'payload',
        },
      ]),
      {
        payload: {
          varField: 3,
        },
      }
    );

    expect(matchedMessage).to.equal(true);
  });

  it('should get smaller payload var then filter value', async function () {
    const matchedMessage = await messageMatcher.filter(
      messageWrapper('Correct Match', 'AND', [
        {
          operator: 'SMALLER',
          value: '3',
          field: 'varField',
          on: 'payload',
        },
      ]),
      {
        payload: {
          varField: 0,
        },
      }
    );

    expect(matchedMessage).to.equal(true);
  });

  it('should get larger or equal payload var then filter value', async function () {
    let matchedMessage = await messageMatcher.filter(
      messageWrapper('Correct Match', 'AND', [
        {
          operator: 'LARGER_EQUAL',
          value: '0',
          field: 'varField',
          on: 'payload',
        },
      ]),
      {
        payload: {
          varField: 3,
        },
      }
    );

    expect(matchedMessage).to.equal(true);

    matchedMessage = await messageMatcher.filter(
      messageWrapper('Correct Match', 'AND', [
        {
          operator: 'LARGER_EQUAL',
          value: '3',
          field: 'varField',
          on: 'payload',
        },
      ]),
      {
        payload: {
          varField: 3,
        },
      }
    );

    expect(matchedMessage).to.equal(true);
  });

  it('should get smaller or equal payload var then filter value', async function () {
    let matchedMessage = await messageMatcher.filter(
      messageWrapper('Correct Match', 'AND', [
        {
          operator: 'SMALLER_EQUAL',
          value: '3',
          field: 'varField',
          on: 'payload',
        },
      ]),
      {
        payload: {
          varField: 0,
        },
      }
    );

    expect(matchedMessage).to.equal(true);

    matchedMessage = await messageMatcher.filter(
      messageWrapper('Correct Match', 'AND', [
        {
          operator: 'SMALLER_EQUAL',
          value: '3',
          field: 'varField',
          on: 'payload',
        },
      ]),
      {
        payload: {
          varField: 3,
        },
      }
    );

    expect(matchedMessage).to.equal(true);
  });

  it('should handle now filters', async function () {
    let matchedMessage = await messageMatcher.filter(
      {
        _templateId: '123',
        template: {
          subject: 'Test Subject',
          type: StepTypeEnum.EMAIL,
          name: '',
          content: 'Test',
          _organizationId: '123',
          _environmentId: 'asdas',
          _creatorId: '123',
        },
        filters: undefined,
      },
      {
        payload: {
          varField: 3,
        },
      }
    );
    expect(matchedMessage).to.equal(true);

    matchedMessage = await messageMatcher.filter(
      {
        _templateId: '123',
        template: {
          subject: 'Test Subject',
          type: StepTypeEnum.EMAIL,
          name: '',
          content: 'Test',
          _organizationId: '123',
          _environmentId: 'asdas',
          _creatorId: '123',
        },
        filters: [],
      },
      {
        payload: {
          varField: 3,
        },
      }
    );
    expect(matchedMessage).to.equal(true);
    matchedMessage = await messageMatcher.filter(
      {
        _templateId: '123',
        template: {
          subject: 'Test Subject',
          type: StepTypeEnum.EMAIL,
          name: '',
          content: 'Test',
          _organizationId: '123',
          _environmentId: 'asdas',
          _creatorId: '123',
        },
        filters: [
          {
            isNegated: false,
            type: 'GROUP',
            value: 'AND',
            children: undefined,
          },
        ],
      },
      {
        payload: {
          varField: 3,
        },
      }
    );
    expect(matchedMessage).to.equal(true);
    matchedMessage = await messageMatcher.filter(
      {
        _templateId: '123',
        template: {
          subject: 'Test Subject',
          type: StepTypeEnum.EMAIL,
          name: '',
          content: 'Test',
          _organizationId: '123',
          _environmentId: 'asdas',
          _creatorId: '123',
        },
        filters: [
          {
            isNegated: false,
            type: 'GROUP',
            value: 'AND',
            children: [],
          },
        ],
      },
      {
        payload: {
          varField: 3,
        },
      }
    );
    expect(matchedMessage).to.equal(true);
  });

  it('should handle webhook filter', async function () {
    const gotGetStub = sinon.stub(axios, 'post').resolves(
      Promise.resolve({
        data: { varField: true },
      })
    );

    let matchedMessage = await messageMatcher.filter(
      messageWrapper('Correct Match', undefined, [
        {
          operator: 'EQUAL',
          value: 'true',
          field: 'varField',
          on: 'webhook',
          webhookUrl: 'www.user.com/webhook',
        },
      ]),
      {
        payload: undefined,
      }
    );

    expect(matchedMessage).to.equal(true);

    gotGetStub.restore();
  });

  it('should skip async filter if child under OR returned true', async function () {
    const gotGetStub = sinon.stub(axios, 'post').resolves(
      Promise.resolve({
        body: '{"varField":true}',
      })
    );

    let matchedMessage = await messageMatcher.filter(
      messageWrapper('Correct Match', 'OR', [
        {
          operator: 'EQUAL',
          value: 'true',
          field: 'payloadVarField',
          on: 'payload',
        },
        {
          operator: 'EQUAL',
          value: 'true',
          field: 'varField',
          on: 'webhook',
          webhookUrl: 'www.user.com/webhook',
        },
      ]),
      {
        payload: { payloadVarField: true },
      }
    );

    let requestsCount = gotGetStub.callCount;

    expect(requestsCount).to.equal(0);
    expect(matchedMessage).to.equal(true);

    //Reorder children order to make sure it is not random

    matchedMessage = await messageMatcher.filter(
      messageWrapper('Correct Match', 'OR', [
        {
          operator: 'EQUAL',
          value: 'true',
          field: 'varField',
          on: 'webhook',
          webhookUrl: 'www.user.com/webhook',
        },
        {
          operator: 'EQUAL',
          value: 'true',
          field: 'payloadVarField',
          on: 'payload',
        },
      ]),
      {
        payload: { payloadVarField: true },
      }
    );

    requestsCount = gotGetStub.callCount;

    expect(requestsCount).to.equal(0);
    expect(matchedMessage).to.equal(true);

    gotGetStub.restore();
  });

  it('should skip async filter if child under AND returned false', async function () {
    const gotGetStub = sinon.stub(axios, 'post').resolves(
      Promise.resolve({
        body: '{"varField":true}',
      })
    );

    let matchedMessage = await messageMatcher.filter(
      messageWrapper('Correct Match', 'AND', [
        {
          operator: 'EQUAL',
          value: 'true',
          field: 'payloadVarField',
          on: 'payload',
        },
        {
          operator: 'EQUAL',
          value: 'true',
          field: 'varField',
          on: 'webhook',
          webhookUrl: 'www.user.com/webhook',
        },
      ]),
      {
        payload: { payloadVarField: false },
      }
    );

    let requestsCount = gotGetStub.callCount;

    expect(requestsCount).to.equal(0);
    expect(matchedMessage).to.equal(false);

    //Reorder children order to make sure it is not random

    matchedMessage = await messageMatcher.filter(
      messageWrapper('Correct Match', 'AND', [
        {
          operator: 'EQUAL',
          value: 'true',
          field: 'varField',
          on: 'webhook',
          webhookUrl: 'www.user.com/webhook',
        },
        {
          operator: 'EQUAL',
          value: 'true',
          field: 'payloadVarField',
          on: 'payload',
        },
      ]),
      {
        payload: { payloadVarField: false },
      }
    );

    requestsCount = gotGetStub.callCount;

    expect(requestsCount).to.equal(0);
    expect(matchedMessage).to.equal(false);

    gotGetStub.restore();
  });
});

function messageWrapper(
  name: string,
  groupOperator: 'AND' | 'OR',
  filters: {
    field: string;
    value: string;
    operator: BuilderFieldOperator;
    on: 'payload' | 'webhook';
    webhookUrl?: string;
  }[],
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
    },
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
