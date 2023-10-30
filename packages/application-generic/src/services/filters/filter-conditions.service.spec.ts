import { expect } from 'chai';
import * as sinon from 'sinon';
import axios from 'axios';
import { Duration, sub } from 'date-fns';
import { ObjectId } from 'mongoose';
import {
  MessageTemplateEntity,
  NotificationStepEntity,
  SubscriberEntity,
  SubscriberRepository,
} from '@novu/dal';
import {
  BuilderGroupValues,
  FieldLogicalOperatorEnum,
  FieldOperatorEnum,
  FilterParts,
  FilterPartTypeEnum,
  FILTER_TO_LABEL,
  JobStatusEnum,
  StepTypeEnum,
  TimeOperatorEnum,
} from '@novu/shared';

import {
  FilterConditionsService,
  IFilterProperties,
} from './filter-conditions.service';

const filterConditionsService = new FilterConditionsService();

let findOneSubscriberStub;
let getFilterDataStub;

beforeEach(() => {
  findOneSubscriberStub = sinon.stub(SubscriberRepository.prototype, 'findOne');
  getFilterDataStub = sinon.stub(filterConditionsService, 'getFilterData');
});

afterEach(() => {
  findOneSubscriberStub.restore();
  getFilterDataStub.restore();
});

describe('Filter Conditions Service', function () {
  describe('Expected functionalities', () => {
    it('should filter correct message by the filter value', async function () {
      const payload = {
        varField: 'firstVar',
      };

      getFilterDataStub.resolves({
        payload,
      });

      const { filters } = makeStep(
        'Correct Match',
        FieldLogicalOperatorEnum.OR,
        [
          {
            operator: FieldOperatorEnum.EQUAL,
            value: 'firstVar',
            field: 'varField',
            on: FilterPartTypeEnum.PAYLOAD,
          },
        ]
      );

      const result = await filterConditionsService.filter(
        filters,
        { payload },
        getFilterProperties()
      );

      expect(result.passed).to.equal(true);
    });

    it('should match a message for AND filter group', async function () {
      const payload = {
        varField: 'firstVar',
        secondField: 'secondVar',
      };
      getFilterDataStub.resolves({
        payload,
      });

      const { filters } = makeStep(
        'Correct Match',
        FieldLogicalOperatorEnum.AND,
        [
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
        ]
      );

      const result = await filterConditionsService.filter(
        filters,
        { payload },
        getFilterProperties()
      );

      expect(result.passed).to.equal(true);
    });

    it('should not match AND group for single bad item', async function () {
      const payload = {
        varField: 'firstVar',
        secondField: 'secondVarBad',
      };
      getFilterDataStub.resolves({
        payload,
      });

      const { filters } = makeStep('Title', FieldLogicalOperatorEnum.AND, [
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
      ]);

      const result = await filterConditionsService.filter(
        filters,
        { payload },
        getFilterProperties()
      );

      expect(result.passed).to.equal(false);
    });

    it('should match a NOT_EQUAL for EQUAL var', async function () {
      const payload = {
        varField: 'firstVar',
        secondField: 'secondVarBad',
      };
      getFilterDataStub.resolves({
        payload,
      });

      const { filters } = makeStep(
        'Correct Match',
        FieldLogicalOperatorEnum.AND,
        [
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
        ]
      );

      const result = await filterConditionsService.filter(
        filters,
        { payload },
        getFilterProperties()
      );

      expect(result.passed).to.equal(true);
    });

    it('should match a EQUAL for a boolean var', async function () {
      const payload = {
        varField: true,
      };
      getFilterDataStub.resolves({
        payload,
      });

      const { filters } = makeStep(
        'Correct Match',
        FieldLogicalOperatorEnum.AND,
        [
          {
            operator: FieldOperatorEnum.EQUAL,
            value: 'true',
            field: 'varField',
            on: FilterPartTypeEnum.PAYLOAD,
          },
        ]
      );

      const result = await filterConditionsService.filter(
        filters,
        { payload },
        getFilterProperties()
      );

      expect(result.passed).to.equal(true);
    });

    it('should fall thru for no filters item', async function () {
      const payload = {
        varField: 'firstVar',
        secondField: 'secondVarBad',
      };
      getFilterDataStub.resolves({
        payload,
      });

      const { filters } = makeStep(
        'Correct Match 2',
        FieldLogicalOperatorEnum.OR,
        []
      );
      const result = await filterConditionsService.filter(
        filters,
        { payload },
        getFilterProperties()
      );

      expect(result.passed).to.equal(true);
    });

    it('should get larger payload var then filter value', async function () {
      const payload = {
        varField: 3,
      };
      getFilterDataStub.resolves({
        payload,
      });

      const { filters } = makeStep(
        'Correct Match',
        FieldLogicalOperatorEnum.AND,
        [
          {
            operator: FieldOperatorEnum.LARGER,
            value: '0',
            field: 'varField',
            on: FilterPartTypeEnum.PAYLOAD,
          },
        ]
      );
      const result = await filterConditionsService.filter(
        filters,
        { payload },
        getFilterProperties()
      );

      expect(result.passed).to.equal(true);
    });

    it('should get smaller payload var then filter value', async function () {
      const payload = {
        varField: 0,
      };
      getFilterDataStub.resolves({
        payload,
      });

      const { filters } = makeStep(
        'Correct Match',
        FieldLogicalOperatorEnum.AND,
        [
          {
            operator: FieldOperatorEnum.SMALLER,
            value: '3',
            field: 'varField',
            on: FilterPartTypeEnum.PAYLOAD,
          },
        ]
      );
      const result = await filterConditionsService.filter(
        filters,
        { payload },
        getFilterProperties()
      );

      expect(result.passed).to.equal(true);
    });

    it('should get larger or equal payload var then filter value', async function () {
      let payload = {
        varField: 3,
      };
      getFilterDataStub.resolves({
        payload,
      });

      const { filters } = makeStep(
        'Correct Match',
        FieldLogicalOperatorEnum.AND,
        [
          {
            operator: FieldOperatorEnum.LARGER_EQUAL,
            value: '0',
            field: 'varField',
            on: FilterPartTypeEnum.PAYLOAD,
          },
        ]
      );
      const result = await filterConditionsService.filter(
        filters,
        { payload },
        getFilterProperties()
      );

      expect(result.passed).to.equal(true);

      payload = {
        varField: 3,
      };
      getFilterDataStub.resolves({
        payload,
      });

      const { filters: secondStepFilters } = makeStep(
        'Correct Match',
        FieldLogicalOperatorEnum.AND,
        [
          {
            operator: FieldOperatorEnum.LARGER_EQUAL,
            value: '3',
            field: 'varField',
            on: FilterPartTypeEnum.PAYLOAD,
          },
        ]
      );
      const secondResult = await filterConditionsService.filter(
        secondStepFilters,
        { payload },
        getFilterProperties()
      );

      expect(secondResult.passed).to.equal(true);
    });

    it('should check if value is defined in payload', async function () {
      const payload = {
        emailMessage: '<b>This works</b>',
      };
      getFilterDataStub.resolves({
        payload,
      });

      const { filters } = makeStep(
        'Correct Match',
        FieldLogicalOperatorEnum.AND,
        [
          {
            operator: FieldOperatorEnum.IS_DEFINED,
            value: '',
            field: 'emailMessage',
            on: FilterPartTypeEnum.PAYLOAD,
          },
        ]
      );
      const result = await filterConditionsService.filter(
        filters,
        { payload },
        getFilterProperties()
      );

      expect(result.passed).to.equal(true);
    });

    it('should check if key is defined or not in subscriber data', async function () {
      const subscriber = {
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
      };
      getFilterDataStub.resolves({
        subscriber,
      });

      const { filters } = makeStep(
        'Correct Match',
        FieldLogicalOperatorEnum.AND,
        [
          {
            operator: FieldOperatorEnum.IS_DEFINED,
            value: '',
            field: 'data.nestedKey',
            on: FilterPartTypeEnum.SUBSCRIBER,
          },
        ]
      );
      const result = await filterConditionsService.filter(
        filters,
        {},
        getFilterProperties()
      );

      expect(result.passed).to.equal(false);
    });

    it('should get nested custom subscriber data', async function () {
      const subscriber = {
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
      };
      getFilterDataStub.resolves({
        subscriber,
      });

      const { filters } = makeStep(
        'Correct Match',
        FieldLogicalOperatorEnum.OR,
        [
          {
            operator: FieldOperatorEnum.EQUAL,
            value: 'nestedValue',
            field: 'data.nestedKey',
            on: FilterPartTypeEnum.SUBSCRIBER,
          },
        ]
      );
      const result = await filterConditionsService.filter(
        filters,
        {},
        getFilterProperties()
      );

      expect(result.passed).to.equal(true);
    });

    it(`should return false with nested data that doesn't exist`, async function () {
      const payload = {
        data: {
          nestedKey: {
            childKey: 'nestedValue',
          },
        },
      };
      getFilterDataStub.resolves({
        payload,
      });

      const { filters } = makeStep(
        'Correct Match',
        FieldLogicalOperatorEnum.OR,
        [
          {
            operator: FieldOperatorEnum.EQUAL,
            value: 'nestedValue',
            field: 'data.nestedKey.doesNotExist',
            on: FilterPartTypeEnum.PAYLOAD,
          },
        ]
      );
      const result = await filterConditionsService.filter(
        filters,
        { payload },
        getFilterProperties()
      );

      expect(result.passed).to.equal(false);
    });

    it('should get smaller or equal payload var then filter value', async function () {
      let payload = {
        varField: 0,
      };
      getFilterDataStub.resolves({
        payload,
      });

      const { filters } = makeStep(
        'Correct Match',
        FieldLogicalOperatorEnum.AND,
        [
          {
            operator: FieldOperatorEnum.SMALLER_EQUAL,
            value: '3',
            field: 'varField',
            on: FilterPartTypeEnum.PAYLOAD,
          },
        ]
      );
      const result = await filterConditionsService.filter(
        filters,
        { payload },
        getFilterProperties()
      );

      expect(result.passed).to.equal(true);

      payload = {
        varField: 3,
      };
      getFilterDataStub.resolves({
        payload,
      });

      const { filters: secondFilters } = makeStep(
        'Correct Match',
        FieldLogicalOperatorEnum.AND,
        [
          {
            operator: FieldOperatorEnum.SMALLER_EQUAL,
            value: '3',
            field: 'varField',
            on: FilterPartTypeEnum.PAYLOAD,
          },
        ]
      );
      const secondResult = await filterConditionsService.filter(
        secondFilters,
        { payload },
        getFilterProperties()
      );

      expect(result.passed).to.equal(true);
    });

    it('should handle no filters', async function () {
      let payload = {
        varField: 3,
      };
      getFilterDataStub.resolves({
        payload,
      });

      const result = await filterConditionsService.filter(
        undefined,
        { payload },
        getFilterProperties()
      );

      expect(result.passed).to.equal(true);

      payload = {
        varField: 3,
      };
      getFilterDataStub.resolves({
        payload,
      });

      const secondResult = await filterConditionsService.filter(
        [],
        { payload },
        getFilterProperties()
      );
      expect(secondResult.passed).to.equal(true);

      payload = {
        varField: 3,
      };
      getFilterDataStub.resolves({
        payload,
      });

      const thirdResult = await filterConditionsService.filter(
        [
          {
            isNegated: false,
            type: 'GROUP',
            value: FieldLogicalOperatorEnum.AND,
            children: [],
          },
        ],
        { payload },
        getFilterProperties()
      );
      expect(thirdResult.passed).to.equal(true);

      payload = {
        varField: 3,
      };
      getFilterDataStub.resolves({
        payload,
      });

      const fourthResult = await filterConditionsService.filter(
        [
          {
            isNegated: false,
            type: 'GROUP',
            value: FieldLogicalOperatorEnum.AND,
            children: [],
          },
        ],
        { payload },
        getFilterProperties()
      );
      expect(fourthResult.passed).to.equal(true);
    });

    it('should handle webhook filter', async function () {
      const payload = {};
      getFilterDataStub.resolves({
        payload,
      });

      const gotGetStub = sinon.stub(axios, 'post').resolves(
        Promise.resolve({
          data: { varField: true },
        })
      );

      const { filters } = makeStep('Correct Match', undefined, [
        {
          operator: FieldOperatorEnum.EQUAL,
          value: 'true',
          field: 'varField',
          on: FilterPartTypeEnum.WEBHOOK,
          webhookUrl: 'www.user.com/webhook',
        },
      ]);
      const result = await filterConditionsService.filter(
        filters,
        { payload },
        getFilterProperties()
      );

      expect(result.passed).to.equal(true);

      gotGetStub.restore();
    });

    it('should skip async filter if child under OR returned true', async function () {
      let payload = { payloadVarField: true };
      getFilterDataStub.resolves({
        payload,
      });

      const gotGetStub = sinon.stub(axios, 'post').resolves(
        Promise.resolve({
          body: JSON.stringify({ varField: true }),
        })
      );

      const { filters } = makeStep(
        'Correct Match',
        FieldLogicalOperatorEnum.OR,
        [
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
        ]
      );
      const result = await filterConditionsService.filter(
        filters,
        { payload },
        getFilterProperties()
      );

      let requestsCount = gotGetStub.callCount;

      expect(requestsCount).to.equal(0);
      expect(result.passed).to.equal(true);

      //Reorder children order to make sure it is not random
      payload = { payloadVarField: true };
      getFilterDataStub.resolves({
        payload,
      });

      const { filters: secondFilters } = makeStep(
        'Correct Match',
        FieldLogicalOperatorEnum.OR,
        [
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
        ]
      );
      const secondResult = await filterConditionsService.filter(
        secondFilters,
        { payload },
        getFilterProperties()
      );

      requestsCount = gotGetStub.callCount;

      expect(requestsCount).to.equal(0);
      expect(secondResult.passed).to.equal(true);

      gotGetStub.restore();
    });

    it('should skip async filter if child under AND returned false', async function () {
      const gotGetStub = sinon.stub(axios, 'post').resolves(
        Promise.resolve({
          body: JSON.stringify({ varField: true }),
        })
      );

      let payload = { payloadVarField: false };
      getFilterDataStub.resolves({
        payload,
      });

      const { filters } = makeStep(
        'Correct Match',
        FieldLogicalOperatorEnum.AND,
        [
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
        ]
      );
      const result = await filterConditionsService.filter(
        filters,
        { payload },
        getFilterProperties()
      );

      let requestsCount = gotGetStub.callCount;

      expect(requestsCount).to.equal(0);
      expect(result.passed).to.equal(false);

      //Reorder children order to make sure it is not random
      payload = { payloadVarField: false };
      getFilterDataStub.resolves({
        payload,
      });

      const { filters: secondFilters } = makeStep(
        'Correct Match',
        FieldLogicalOperatorEnum.AND,
        [
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
        ]
      );
      const secondResult = await filterConditionsService.filter(
        filters,
        { payload },
        getFilterProperties()
      );

      requestsCount = gotGetStub.callCount;

      expect(requestsCount).to.equal(0);
      expect(secondResult.passed).to.equal(false);

      gotGetStub.restore();
    });
  });

  describe('is online filters', () => {
    describe('isOnline', () => {
      it('allows to process multiple filter parts', async () => {
        findOneSubscriberStub.resolves(
          getSubscriber({ isOnline: true }) as SubscriberEntity
        );

        const payload = { payloadVarField: true };
        getFilterDataStub.resolves({
          payload,
        });

        const { filters } = makeStep(
          'Correct Match',
          FieldLogicalOperatorEnum.AND,
          [
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
          ]
        );
        const result = await filterConditionsService.filter(
          filters,
          { payload },
          getFilterProperties()
        );

        expect(result.passed).to.equal(true);
      });

      it(`doesn't allow to process if the subscriber has no online fields set and filter is true`, async () => {
        findOneSubscriberStub.resolves(getSubscriber() as SubscriberEntity);

        const payload = {};

        getFilterDataStub.resolves({
          payload,
        });

        const { filters } = makeStep(
          'Correct Match',
          FieldLogicalOperatorEnum.AND,
          [
            {
              on: FilterPartTypeEnum.IS_ONLINE,
              value: true,
            },
          ]
        );

        const result = await filterConditionsService.filter(
          filters,
          { payload },
          getFilterProperties()
        );

        expect(result.passed).to.equal(false);
      });

      it(`doesn't allow to process if the subscriber has no online fields set and filter is false`, async () => {
        findOneSubscriberStub.resolves(getSubscriber() as SubscriberEntity);

        const payload = {};

        getFilterDataStub.resolves({
          payload,
        });

        const { filters } = makeStep(
          'Correct Match',
          FieldLogicalOperatorEnum.AND,
          [
            {
              on: FilterPartTypeEnum.IS_ONLINE,
              value: false,
            },
          ]
        );

        const result = await filterConditionsService.filter(
          filters,
          { payload },
          getFilterProperties()
        );

        expect(result.passed).to.equal(false);
      });

      it('allows to process if the subscriber is online', async () => {
        findOneSubscriberStub.resolves(
          getSubscriber({ isOnline: true }) as SubscriberEntity
        );

        const payload = {};

        getFilterDataStub.resolves({
          payload,
        });

        const { filters } = makeStep(
          'Correct Match',
          FieldLogicalOperatorEnum.AND,
          [
            {
              on: FilterPartTypeEnum.IS_ONLINE,
              value: true,
            },
          ]
        );

        const result = await filterConditionsService.filter(
          filters,
          { payload },
          getFilterProperties()
        );

        expect(result.passed).to.equal(true);
      });

      it(`doesn't allow to process if the subscriber is not online`, async () => {
        findOneSubscriberStub.resolves(
          getSubscriber({ isOnline: false }) as SubscriberEntity
        );

        const payload = {};

        getFilterDataStub.resolves({
          payload,
        });

        const { filters } = makeStep(
          'Correct Match',
          FieldLogicalOperatorEnum.AND,
          [
            {
              on: FilterPartTypeEnum.IS_ONLINE,
              value: true,
            },
          ]
        );

        const result = await filterConditionsService.filter(
          filters,
          { payload },
          getFilterProperties()
        );

        expect(result.passed).to.equal(false);
      });
    });

    describe('isOnlineInLast', () => {
      it('allows to process multiple filter parts', async () => {
        findOneSubscriberStub.resolves(
          getSubscriber(
            { isOnline: true },
            { subDuration: { minutes: 3 } }
          ) as SubscriberEntity
        );

        const payload = { payloadVarField: true };

        getFilterDataStub.resolves({
          payload,
        });

        const { filters } = makeStep(
          'Correct Match',
          FieldLogicalOperatorEnum.AND,
          [
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
          ]
        );

        const result = await filterConditionsService.filter(
          filters,
          { payload },
          getFilterProperties()
        );

        expect(result.passed).to.equal(true);
      });

      it(`doesn't allow to process if the subscriber with no online fields set`, async () => {
        findOneSubscriberStub.resolves(getSubscriber() as SubscriberEntity);
        const payload = {};

        getFilterDataStub.resolves({
          payload,
        });

        const { filters } = makeStep(
          'Correct Match',
          FieldLogicalOperatorEnum.AND,
          [
            {
              on: FilterPartTypeEnum.IS_ONLINE_IN_LAST,
              value: 5,
              timeOperator: TimeOperatorEnum.MINUTES,
            },
          ]
        );

        const result = await filterConditionsService.filter(
          filters,
          { payload },
          getFilterProperties()
        );

        expect(result.passed).to.equal(false);
      });

      it('allows to process if the subscriber is still online', async () => {
        findOneSubscriberStub.resolves(
          getSubscriber(
            { isOnline: true },
            { subDuration: { minutes: 10 } }
          ) as SubscriberEntity
        );
        const payload = {};

        getFilterDataStub.resolves({
          payload,
        });

        const { filters } = makeStep(
          'Correct Match',
          FieldLogicalOperatorEnum.AND,
          [
            {
              on: FilterPartTypeEnum.IS_ONLINE_IN_LAST,
              value: 5,
              timeOperator: TimeOperatorEnum.MINUTES,
            },
          ]
        );

        const result = await filterConditionsService.filter(
          filters,
          { payload },
          getFilterProperties()
        );

        expect(result.passed).to.equal(true);
      });

      it('allows to process if the subscriber was online in last 5 min', async () => {
        findOneSubscriberStub.resolves(
          getSubscriber(
            { isOnline: false },
            { subDuration: { minutes: 4 } }
          ) as SubscriberEntity
        );
        const payload = {};

        getFilterDataStub.resolves({
          payload,
        });

        const { filters } = makeStep(
          'Correct Match',
          FieldLogicalOperatorEnum.AND,
          [
            {
              on: FilterPartTypeEnum.IS_ONLINE_IN_LAST,
              value: 5,
              timeOperator: TimeOperatorEnum.MINUTES,
            },
          ]
        );

        const result = await filterConditionsService.filter(
          filters,
          { payload },
          getFilterProperties()
        );

        expect(result.passed).to.equal(true);
      });

      it(`doesn't allow to process if the subscriber was online more that last 5 min`, async () => {
        findOneSubscriberStub.resolves(
          getSubscriber(
            { isOnline: false },
            { subDuration: { minutes: 6 } }
          ) as SubscriberEntity
        );
        const payload = {};

        getFilterDataStub.resolves({
          payload,
        });

        const { filters } = makeStep(
          'Correct Match',
          FieldLogicalOperatorEnum.AND,
          [
            {
              on: FilterPartTypeEnum.IS_ONLINE_IN_LAST,
              value: 5,
              timeOperator: TimeOperatorEnum.MINUTES,
            },
          ]
        );

        const result = await filterConditionsService.filter(
          filters,
          { payload },
          getFilterProperties()
        );

        expect(result.passed).to.equal(false);
      });

      it('allows to process if the subscriber was online in last 1 hour', async () => {
        findOneSubscriberStub.resolves(
          getSubscriber(
            { isOnline: false },
            { subDuration: { minutes: 30 } }
          ) as SubscriberEntity
        );
        const payload = {};

        getFilterDataStub.resolves({
          payload,
        });

        const { filters } = makeStep(
          'Correct Match',
          FieldLogicalOperatorEnum.AND,
          [
            {
              on: FilterPartTypeEnum.IS_ONLINE_IN_LAST,
              value: 1,
              timeOperator: TimeOperatorEnum.HOURS,
            },
          ]
        );

        const result = await filterConditionsService.filter(
          filters,
          { payload },
          getFilterProperties()
        );

        expect(result.passed).to.equal(true);
      });

      it('allows to process if the subscriber was online in last 1 day', async () => {
        findOneSubscriberStub.resolves(
          getSubscriber(
            { isOnline: false },
            { subDuration: { hours: 23 } }
          ) as SubscriberEntity
        );
        const payload = {};

        getFilterDataStub.resolves({
          payload,
        });

        const { filters } = makeStep(
          'Correct Match',
          FieldLogicalOperatorEnum.AND,
          [
            {
              on: FilterPartTypeEnum.IS_ONLINE_IN_LAST,
              value: 1,
              timeOperator: TimeOperatorEnum.DAYS,
            },
          ]
        );

        const result = await filterConditionsService.filter(
          filters,
          { payload },
          getFilterProperties()
        );

        expect(result.passed).to.equal(true);
      });
    });
  });
});

const getSubscriber = (
  { isOnline }: { isOnline?: boolean } = {},
  { subDuration }: { subDuration?: Duration } = {}
) => ({
  firstName: 'John',
  lastName: 'Doe',
  ...(isOnline && { isOnline: isOnline ?? true }),
  ...(subDuration && {
    lastOnlineAt: subDuration
      ? sub(new Date(), subDuration).toISOString()
      : undefined,
  }),
});

function makeStep(
  name: string,
  groupOperator: BuilderGroupValues = FieldLogicalOperatorEnum.AND,
  filters: FilterParts[],
  channel = StepTypeEnum.EMAIL
): NotificationStepEntity {
  return {
    _templateId: '123',
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

function getFilterProperties(): IFilterProperties {
  return {
    environmentId: '123',
    identifier: '123',
    organizationId: '123',
    transactionId: '123',
    subscriberId: '1234',
    job: {
      _id: '123',
      _environmentId: '123',
      _notificationId: '123',
      _organizationId: '123',
      _subscriberId: '123',
      _templateId: '123',
      identifier: '123',
      overrides: undefined,
      payload: {},
      step: {
        _templateId: '123',
      },
      status: JobStatusEnum.RUNNING,
      subscriberId: '1234',
      transactionId: '123',
      type: StepTypeEnum.EMAIL,
      _userId: '123',
      createdAt: Date.now().toString(),
      updatedAt: Date.now().toString(),
    },
  };
}
