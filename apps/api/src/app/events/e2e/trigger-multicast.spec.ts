import { expect } from 'chai';

import { ITopic, SubscriberSourceEnum, TriggerRecipientsTypeEnum, TriggerRecipientSubscriber } from '@novu/shared';
import {
  buildSubscriberDefine,
  IProcessSubscriberBulkJobDto,
  mapSubscribersToJobs,
  splitByRecipientType,
  validateSubscriberDefine,
} from '@novu/application-generic';
import { ISubscribersDefine } from '@novu/shared';

describe('TriggerMulticast Spec', () => {
  describe('splitByRecipientType', () => {
    it('should split recipients into singleSubscribers and topicKeys', async () => {
      const recipients: Array<ISubscribersDefine | ITopic> = [
        { subscriberId: '1', firstName: 'John', lastName: 'Doe' },
        { subscriberId: '2', firstName: 'Jane', lastName: 'Doe' },
        { type: TriggerRecipientsTypeEnum.TOPIC, topicKey: 'topic1' },
        { subscriberId: '3', firstName: 'Bob', lastName: 'Smith' },
      ];

      const result = splitByRecipientType(recipients);

      expect(result.singleSubscribers.size).to.be.equal(3);
      expect(result.topicKeys.size).to.be.equal(1);
      expect(result.topicKeys.has('topic1')).to.be.equal(true);
    });

    it('should handle empty array of recipients', async () => {
      const recipients: Array<ISubscribersDefine | ITopic> = [];

      const result = splitByRecipientType(recipients);

      expect(result.singleSubscribers.size).to.be.equal(0);
      expect(result.topicKeys.size).to.be.equal(0);
    });

    it('should handle null/undefined values in the array', async () => {
      const recipients: Array<ISubscribersDefine | ITopic | null | undefined> = [
        null,
        undefined,
        { subscriberId: '1', firstName: 'John', lastName: 'Doe' },
        null,
        { type: TriggerRecipientsTypeEnum.TOPIC, topicKey: 'topic1' },
        undefined,
      ];

      const result = splitByRecipientType(recipients as any);

      expect(result.singleSubscribers.size).to.be.equal(1);
      expect(result.topicKeys.size).to.be.equal(1);
    });

    it('should handle arrays with only topics', async () => {
      const recipients: Array<ISubscribersDefine | ITopic> = [
        { type: TriggerRecipientsTypeEnum.TOPIC, topicKey: 'topic1' },
        { type: TriggerRecipientsTypeEnum.TOPIC, topicKey: 'topic2' },
      ];

      const result = splitByRecipientType(recipients);

      expect(result.singleSubscribers.size).to.be.equal(0);
      expect(result.topicKeys.size).to.be.equal(2);
    });

    it('should handle arrays with only subscribers', async () => {
      const recipients: Array<ISubscribersDefine | ITopic> = [
        { subscriberId: '1', firstName: 'John', lastName: 'Doe' },
        { subscriberId: '2', firstName: 'Jane', lastName: 'Doe' },
      ];

      const result = splitByRecipientType(recipients);

      expect(result.singleSubscribers.size).to.be.equal(2);
      expect(result.topicKeys.size).to.be.equal(0);
    });

    it('should handle arrays with duplicate subscriber IDs', async () => {
      const recipients: Array<ISubscribersDefine | ITopic> = [
        { subscriberId: '1', firstName: 'John', lastName: 'Doe' },
        { subscriberId: '2', firstName: 'Jane', lastName: 'Doe' },
        { subscriberId: '1', firstName: 'Bob', lastName: 'Smith' },
      ];

      const result = splitByRecipientType(recipients);

      expect(result.singleSubscribers.size).to.be.equal(2);
      expect(result.topicKeys.size).to.be.equal(0);
    });

    it('should handle arrays with duplicate topics', async () => {
      const recipients: Array<ISubscribersDefine | ITopic> = [
        { type: TriggerRecipientsTypeEnum.TOPIC, topicKey: 'topic1' },
        { subscriberId: '1', firstName: 'John', lastName: 'Doe' },
        { type: TriggerRecipientsTypeEnum.TOPIC, topicKey: 'topic2' },
        { type: TriggerRecipientsTypeEnum.TOPIC, topicKey: 'topic1' },
        { subscriberId: '2', firstName: 'Jane', lastName: 'Doe' },
      ];

      const result = splitByRecipientType(recipients);

      expect(result.singleSubscribers.size).to.be.equal(2);
      expect(result.topicKeys.size).to.be.equal(2);
    });
  });

  describe('buildSubscriberDefine', () => {
    it('should build ISubscribersDefine from string subscriber ID', async () => {
      const recipient: TriggerRecipientSubscriber = '123';

      const result = buildSubscriberDefine(recipient);

      expect(result).to.be.ok;
      expect(result.subscriberId).to.be.equal('123'); // Ensure correct subscriber ID
    });

    it('should build ISubscribersDefine from ISubscribersDefine object', async () => {
      const recipient: TriggerRecipientSubscriber = {
        subscriberId: '123',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
      };

      const result = buildSubscriberDefine(recipient);

      expect(result).to.be.ok;
      expect(result).to.be.equal(recipient);
    });

    it('should throw error for invalid ISubscribersDefine object', async () => {
      const recipient = [{ subscriberId: '123' }];

      expect(() => buildSubscriberDefine(recipient as any)).to.throw(
        'subscriberId under property to is type array, which is not allowed please make sure all subscribers ids are strings'
      );
    });
  });

  describe('validateSubscriberDefine', () => {
    it('should throw error if recipient is an array', async () => {
      const recipient: any = ['subscriber123'];

      expect(() => validateSubscriberDefine(recipient)).to.throw(
        'subscriberId under property to is type array, which is not allowed please make sure all subscribers ids are strings'
      );
    });

    it('should throw error if recipient is null or undefined', async () => {
      const recipient: any = null;

      expect(() => validateSubscriberDefine(recipient)).to.throw(
        'subscriberId under property to is not configured, please make sure all subscribers contains subscriberId property'
      );

      const recipient2: any = undefined;

      expect(() => validateSubscriberDefine(recipient2)).to.throw(
        'subscriberId under property to is not configured, please make sure all subscribers contains subscriberId property'
      );
    });

    it('should throw error if recipient does not have subscriberId property', async () => {
      const recipient: any = {};

      expect(() => validateSubscriberDefine(recipient)).to.throw(
        'subscriberId under property to is not configured, please make sure all subscribers contains subscriberId property'
      );
    });

    it('should not throw error if recipient is valid', async () => {
      const recipient: ISubscribersDefine = {
        subscriberId: 'subscriber123',
        firstName: 'John',
        lastName: 'Doe',
      };

      expect(() => validateSubscriberDefine(recipient)).not.to.throw();
    });
  });

  describe('mapSubscribersToJobs', () => {
    const subscriberSource: SubscriberSourceEnum = SubscriberSourceEnum.SINGLE;
    const subscribers: ISubscribersDefine[] = [
      { subscriberId: 'subscriber123', firstName: 'John', lastName: 'Doe' },
      { subscriberId: 'subscriber456', firstName: 'Jane', lastName: 'Doe' },
    ];

    it('should map subscribers to jobs with correct data', async () => {
      const jobs: IProcessSubscriberBulkJobDto[] = mapSubscribersToJobs(
        subscriberSource,
        subscribers,
        triggerMulticastCommandMock as any
      );

      expect(jobs.length).to.be.equal(2);
      expect(jobs[0].name).to.be.equal('428fa85a-2529-4186-80ad-3bf29d365de2subscriber123');
      expect(jobs[0].data.environmentId).to.be.equal('65ccfbfb374a4f35856d76f7');
      expect(jobs[1].name).to.be.equal('428fa85a-2529-4186-80ad-3bf29d365de2subscriber456');
      expect(jobs[1].data.environmentId).to.be.equal('65ccfbfb374a4f35856d76f7');
    });
  });
});

const triggerMulticastCommandMock = {
  userId: '65ccfbfb374a4f35856d76ef',
  environmentId: '65ccfbfb374a4f35856d76f7',
  organizationId: '65ccfbfb374a4f35856d76f1',
  identifier: 'test-event-b0a06229-98d2-4a15-b062-10146d10ef53',
  payload: {
    customVar: 'Testing of User Name',
  },
  overrides: {},
  to: ['65ccfbfb374a4f35856d7754'],
  transactionId: '428fa85a-2529-4186-80ad-3bf29d365de2',
  addressingType: 'multicast',
  requestCategory: 'single',
  tenant: null,
  template: {
    preferenceSettings: {
      email: true,
      sms: true,
      in_app: true,
      chat: true,
      push: true,
    },
    _id: '65ccfbfb374a4f35856d775c',
    name: 'Central Assurance Analyst',
    description: 'The Nagasaki Lander is the trademarked name of several series of Nagasaki sport bikes, tha',
    active: true,
    draft: false,
    critical: false,
    isBlueprint: false,
    _notificationGroupId: '65ccfbfb374a4f35856d76fa',
    tags: ['test-tag'],
    triggers: [
      {
        type: 'event',
        identifier: 'test-event-b0a06229-98d2-4a15-b062-10146d10ef53',
        variables: [
          {
            name: 'firstName',
            _id: '65ccfbfb374a4f35856d775e',
            id: '65ccfbfb374a4f35856d775e',
          },
          {
            name: 'lastName',
            _id: '65ccfbfb374a4f35856d775f',
            id: '65ccfbfb374a4f35856d775f',
          },
          {
            name: 'urlVariable',
            _id: '65ccfbfb374a4f35856d7760',
            id: '65ccfbfb374a4f35856d7760',
          },
        ],
        _id: '65ccfbfb374a4f35856d775d',
        reservedVariables: [],
        subscriberVariables: [],
        id: '65ccfbfb374a4f35856d775d',
      },
    ],
    steps: [
      {
        metadata: {
          timed: {
            weekDays: [],
            monthDays: [],
          },
        },
        active: true,
        shouldStopOnFail: false,
        filters: [],
        _templateId: '65ccfbfb374a4f35856d775a',
        variants: [],
        _id: '65ccfbfb374a4f35856d7761',
        id: '65ccfbfb374a4f35856d7761',
        template: {
          _id: '65ccfbfb374a4f35856d775a',
          type: 'sms',
          active: true,
          variables: [],
          content: 'Hello world {{customVar}}',
          _environmentId: '65ccfbfb374a4f35856d76f7',
          _organizationId: '65ccfbfb374a4f35856d76f1',
          _creatorId: '65ccfbfb374a4f35856d76ef',
          _feedId: '65ccfbfb374a4f35856d7726',
          _layoutId: '65ccfbfb374a4f35856d76fc',
          deleted: false,
          createdAt: '2024-02-14T17:44:27.529Z',
          updatedAt: '2024-02-14T17:44:27.529Z',
          __v: 0,
          id: '65ccfbfb374a4f35856d775a',
        },
      },
    ],
    _environmentId: '65ccfbfb374a4f35856d76f7',
    _organizationId: '65ccfbfb374a4f35856d76f1',
    _creatorId: '65ccfbfb374a4f35856d76ef',
    deleted: false,
    createdAt: '2024-02-14T17:44:27.532Z',
    updatedAt: '2024-02-14T17:44:27.532Z',
    __v: 0,
    id: '65ccfbfb374a4f35856d775c',
  },
};
