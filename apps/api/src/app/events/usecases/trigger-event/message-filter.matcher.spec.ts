import { BuilderFieldOperator, ChannelTypeEnum } from '@novu/shared';
import { expect } from 'chai';
import { MessageEntity, StepFilter, NotificationStepEntity } from '@novu/dal';
import { matchMessageWithFilters } from './message-filter.matcher';

describe('Message filter matcher', function () {
  it('should filter correct message by the filter value', function () {
    const matchedMessage = matchMessageWithFilters(
      ChannelTypeEnum.EMAIL,
      [
        messageWrapper('Correct Match', 'OR', [
          {
            operator: 'EQUAL',
            value: 'firstVar',
            field: 'varField',
          },
        ]),
        messageWrapper('Bad Match', 'OR', [
          {
            operator: 'EQUAL',
            value: 'otherValue',
            field: 'varField',
          },
        ]),
      ],
      {
        varField: 'firstVar',
      }
    );

    expect(matchedMessage.length).to.equal(1);
    expect(matchedMessage[0].template.name).to.equal('Correct Match');
  });

  it('should filter correct message by the channel', function () {
    const matchedMessage = matchMessageWithFilters(
      ChannelTypeEnum.EMAIL,
      [
        messageWrapper('Correct Match', 'OR', [
          {
            operator: 'EQUAL',
            value: 'firstVar',
            field: 'varField',
          },
        ]),
        messageWrapper(
          'Bad Match',
          'OR',
          [
            {
              operator: 'EQUAL',
              value: 'firstVar',
              field: 'varField',
            },
          ],
          ChannelTypeEnum.IN_APP
        ),
      ],
      {
        varField: 'firstVar',
      }
    );

    expect(matchedMessage.length).to.equal(1);
    expect(matchedMessage[0].template.name).to.equal('Correct Match');
  });

  it('should handle multiple message matches', function () {
    const matchedMessage = matchMessageWithFilters(
      ChannelTypeEnum.EMAIL,
      [
        messageWrapper('Correct Match', 'OR', [
          {
            operator: 'EQUAL',
            value: 'firstVar',
            field: 'varField',
          },
        ]),
        messageWrapper('Correct Message', 'OR', [
          {
            operator: 'EQUAL',
            value: 'secondVar',
            field: 'secondField',
          },
        ]),
      ],
      {
        varField: 'firstVar',
        secondField: 'secondVar',
      }
    );

    expect(matchedMessage.length).to.equal(2);
    expect(matchedMessage[0].template.name).to.equal('Correct Match');
  });

  it('should match a message for AND filter group', function () {
    const matchedMessage = matchMessageWithFilters(
      ChannelTypeEnum.EMAIL,
      [
        messageWrapper('Correct Match', 'AND', [
          {
            operator: 'EQUAL',
            value: 'firstVar',
            field: 'varField',
          },
          {
            operator: 'EQUAL',
            value: 'secondVar',
            field: 'secondField',
          },
        ]),
      ],
      {
        varField: 'firstVar',
        secondField: 'secondVar',
      }
    );

    expect(matchedMessage.length).to.equal(1);
    expect(matchedMessage[0].template.name).to.equal('Correct Match');
  });

  it('should not match AND group for single bad item', function () {
    const matchedMessage = matchMessageWithFilters(
      ChannelTypeEnum.EMAIL,
      [
        messageWrapper('Title', 'AND', [
          {
            operator: 'EQUAL',
            value: 'firstVar',
            field: 'varField',
          },
          {
            operator: 'EQUAL',
            value: 'secondVar',
            field: 'secondField',
          },
        ]),
      ],
      {
        varField: 'firstVar',
        secondField: 'secondVarBad',
      }
    );

    expect(matchedMessage.length).to.equal(0);
  });

  it('should match a NOT_EQUAL for EQUAL var', function () {
    const matchedMessage = matchMessageWithFilters(
      ChannelTypeEnum.EMAIL,
      [
        messageWrapper('Correct Match', 'AND', [
          {
            operator: 'EQUAL',
            value: 'firstVar',
            field: 'varField',
          },
          {
            operator: 'NOT_EQUAL',
            value: 'secondVar',
            field: 'secondField',
          },
        ]),
      ],
      {
        varField: 'firstVar',
        secondField: 'secondVarBad',
      }
    );

    expect(matchedMessage.length).to.equal(1);
    expect(matchedMessage[0].template.name).to.equal('Correct Match');
  });

  it('should fall thru for no filters item', function () {
    const matchedMessage = matchMessageWithFilters(
      ChannelTypeEnum.EMAIL,
      [
        messageWrapper('Correct Match', 'AND', [
          {
            operator: 'EQUAL',
            value: 'firstVar',
            field: 'varField',
          },
          {
            operator: 'NOT_EQUAL',
            value: 'secondVar',
            field: 'secondField',
          },
        ]),
        messageWrapper('Correct Match 2', 'OR', []),
      ],
      {
        varField: 'firstVar',
        secondField: 'secondVarBad',
      }
    );

    expect(matchedMessage.length).to.equal(2);
    expect(matchedMessage[0].template.name).to.equal('Correct Match');
    expect(matchedMessage[1].template.name).to.equal('Correct Match 2');
  });
});

function messageWrapper(
  name: string,
  groupOperator: 'AND' | 'OR',
  filters: {
    field: string;
    value: string;
    operator: BuilderFieldOperator;
  }[],
  channel = ChannelTypeEnum.EMAIL
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
