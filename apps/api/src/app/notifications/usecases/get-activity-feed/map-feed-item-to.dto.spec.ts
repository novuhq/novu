import { NotificationFeedItemEntity } from '@novu/dal';
import { FieldLogicalOperatorEnum, FieldOperatorEnum, FilterPartTypeEnum, StepTypeEnum } from '@novu/shared';
import { expect } from 'chai';
import { mapFeedItemToDto } from './map-feed-item-to.dto';

describe('mapFeedItemToDto', () => {
  it('maps nested step filter groups in filter children without throwing', () => {
    const entity = {
      _id: 'notification-id',
      jobs: [
        {
          _id: 'job-id',
          type: StepTypeEnum.EMAIL,
          status: 'completed',
          executionDetails: [],
          step: {
            _id: 'step-id',
            active: true,
            filters: [
              {
                isNegated: false,
                type: 'GROUP',
                value: FieldLogicalOperatorEnum.AND,
                children: [
                  {
                    isNegated: false,
                    type: 'GROUP',
                    value: FieldLogicalOperatorEnum.OR,
                    children: [
                      {
                        on: FilterPartTypeEnum.PAYLOAD,
                        field: 'status',
                        value: 'active',
                        operator: FieldOperatorEnum.EQUAL,
                      },
                    ],
                  },
                ],
              },
            ],
          },
        },
      ],
    } as unknown as NotificationFeedItemEntity;

    const dto = mapFeedItemToDto(entity);
    const job = dto.jobs?.[0];

    expect(job).to.exist;
    expect(job!.step.filters).to.have.length(2);
    expect(job!.step.filters[0].children).to.have.length(0);
    expect(job!.step.filters[1].children[0].on).to.equal(FilterPartTypeEnum.PAYLOAD);
  });
});
