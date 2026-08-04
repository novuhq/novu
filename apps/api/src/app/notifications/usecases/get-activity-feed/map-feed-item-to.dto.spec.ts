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
    expect(job!.step.filters).to.have.length(1);
    expect(job!.step.filters[0].value).to.equal(FieldLogicalOperatorEnum.OR);
    expect(job!.step.filters[0].children).to.have.length(1);
    expect(job!.step.filters[0].children[0].on).to.equal(FilterPartTypeEnum.PAYLOAD);
  });

  it('keeps leaf children on the parent while promoting sibling nested groups', () => {
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
                    on: FilterPartTypeEnum.PAYLOAD,
                    field: 'plan',
                    value: 'pro',
                    operator: FieldOperatorEnum.EQUAL,
                  },
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
    const filters = dto.jobs?.[0]?.step.filters;

    expect(filters).to.have.length(2);
    expect(filters![0].value).to.equal(FieldLogicalOperatorEnum.AND);
    expect(filters![0].children).to.have.length(1);
    expect(filters![0].children[0].on).to.equal(FilterPartTypeEnum.PAYLOAD);
    expect((filters![0].children[0] as { field?: string }).field).to.equal('plan');
    expect(filters![1].value).to.equal(FieldLogicalOperatorEnum.OR);
    expect(filters![1].children[0].on).to.equal(FilterPartTypeEnum.PAYLOAD);
  });
});
