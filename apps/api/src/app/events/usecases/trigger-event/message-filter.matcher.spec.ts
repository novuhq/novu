import { BuilderFieldOperator, StepTypeEnum } from '@novu/shared';
import { expect } from 'chai';
import { NotificationStepEntity } from '@novu/dal';
import { matchMessageWithFilters } from './message-filter.matcher';

describe('Message filter matcher', function () {
  it('should filter correct message by the filter value', function () {
    const matchedMessage = matchMessageWithFilters(
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

  it('should match a message for AND filter group', function () {
    const matchedMessage = matchMessageWithFilters(
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

  it('should not match AND group for single bad item', function () {
    const matchedMessage = matchMessageWithFilters(
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

  it('should match a NOT_EQUAL for EQUAL var', function () {
    const matchedMessage = matchMessageWithFilters(
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

  it('should match a EQUAL for a boolean var', function () {
    const matchedMessage = matchMessageWithFilters(
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

  it('should fall thru for no filters item', function () {
    const matchedMessage = matchMessageWithFilters(messageWrapper('Correct Match 2', 'OR', []), {
      payload: {
        varField: 'firstVar',
        secondField: 'secondVarBad',
      },
    });

    expect(matchedMessage).to.equal(true);
  });

  it('should get larger payload var then filter value', function () {
    const matchedMessage = matchMessageWithFilters(
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

  it('should get smaller payload var then filter value', function () {
    const matchedMessage = matchMessageWithFilters(
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

  it('should get larger or equal payload var then filter value', function () {
    let matchedMessage = matchMessageWithFilters(
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

    matchedMessage = matchMessageWithFilters(
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

  it('should get smaller or equal payload var then filter value', function () {
    let matchedMessage = matchMessageWithFilters(
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

    matchedMessage = matchMessageWithFilters(
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

  it('should handle now filters', function () {
    let matchedMessage = matchMessageWithFilters(
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

    matchedMessage = matchMessageWithFilters(
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
    matchedMessage = matchMessageWithFilters(
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
    matchedMessage = matchMessageWithFilters(
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
});

function messageWrapper(
  name: string,
  groupOperator: 'AND' | 'OR',
  filters: {
    field: string;
    value: string;
    operator: BuilderFieldOperator;
    on: 'payload';
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
