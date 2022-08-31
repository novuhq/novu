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
        varField: 'firstVar',
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
        varField: 'firstVar',
        secondField: 'secondVar',
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
        varField: 'firstVar',
        secondField: 'secondVarBad',
      }
    );

    expect(matchedMessage).to.equal(true);
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
        varField: 'firstVar',
        secondField: 'secondVarBad',
      }
    );

    expect(matchedMessage).to.equal(true);
  });

  it('should fall thru for no filters item', function () {
    const matchedMessage = matchMessageWithFilters(messageWrapper('Correct Match 2', 'OR', []), {
      varField: 'firstVar',
      secondField: 'secondVarBad',
    });

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
