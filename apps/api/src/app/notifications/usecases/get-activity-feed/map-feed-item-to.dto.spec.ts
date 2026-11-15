import { ActivitiesResponseDto$inboundSchema } from '@novu/api/models/components';
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

  it('preserves parent negation when promoting a nested-only filter group', () => {
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
                isNegated: true,
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
    const filters = dto.jobs?.[0]?.step.filters;

    expect(filters).to.have.length(1);
    expect(filters![0].isNegated).to.equal(true);
    expect(filters![0].value).to.equal(FieldLogicalOperatorEnum.OR);
    expect(filters![0].children[0].on).to.equal(FilterPartTypeEnum.PAYLOAD);
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

  it('keeps a null subscriber phone on the activity response', () => {
    const entity = {
      _id: 'notification-id',
      jobs: [],
      subscriber: {
        _id: 'subscriber-internal-id',
        subscriberId: 'subscriber-id',
        firstName: null,
        lastName: null,
        email: null,
        phone: null,
      },
    } as unknown as NotificationFeedItemEntity;

    const dto = mapFeedItemToDto(entity);

    expect(dto.subscriber?.phone).to.equal(null);
    expect(dto.subscriber?.email).to.equal(null);
    expect(dto.subscriber?.firstName).to.equal(null);
    expect(dto.subscriber?.lastName).to.equal(null);
  });
});

describe('notifications.list subscriber validation', () => {
  function parseActivityList(subscriber: Record<string, unknown>) {
    return ActivitiesResponseDto$inboundSchema.safeParse({
      hasMore: false,
      page: 0,
      pageSize: 10,
      data: [
        {
          _environmentId: 'environment-id',
          _organizationId: 'organization-id',
          _subscriberId: 'subscriber-internal-id',
          transactionId: 'transaction-id',
          subscriber,
        },
      ],
    });
  }

  it('accepts a subscriber with a null phone number', () => {
    const parsed = parseActivityList({
      _id: 'subscriber-internal-id',
      subscriberId: 'subscriber-id',
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
      phone: null,
    });

    expect(parsed.success).to.equal(true);
    if (!parsed.success) {
      return;
    }

    expect(parsed.data.data[0]?.subscriber?.phone).to.equal(null);
  });

  it('accepts a subscriber whose cleared profile fields are null', () => {
    const parsed = parseActivityList({
      _id: 'subscriber-internal-id',
      subscriberId: 'subscriber-id',
      firstName: null,
      lastName: null,
      email: null,
      phone: null,
    });

    expect(parsed.success).to.equal(true);
    if (!parsed.success) {
      return;
    }

    expect(parsed.data.data[0]?.subscriber?.email).to.equal(null);
    expect(parsed.data.data[0]?.subscriber?.phone).to.equal(null);
  });

  it('accepts a subscriber when the phone field is omitted', () => {
    const parsed = parseActivityList({
      _id: 'subscriber-internal-id',
      subscriberId: 'subscriber-id',
      email: 'test@example.com',
    });

    expect(parsed.success).to.equal(true);
    if (!parsed.success) {
      return;
    }

    expect(parsed.data.data[0]?.subscriber?.phone).to.equal(undefined);
  });
});
