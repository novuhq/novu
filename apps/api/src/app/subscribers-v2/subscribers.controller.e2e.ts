import { randomBytes } from 'crypto';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import { SubscribersControllerSearchSubscribersRequest } from '@novu/api/src/models/operations';
import { OrderDirection } from '@novu/api/models/operations';
import { Novu } from '@novu/api';
import { SubscriberResponseDto } from '@novu/api/models/components';
import { initNovuClassSdk } from '../shared/helpers/e2e/sdk/e2e-sdk.helper';

let session: UserSession;

describe('Subscriber Controller E2E API Testing #novu-v2', () => {
  let novuClient: Novu;
  beforeEach(async () => {
    session = new UserSession();
    await session.initialize({ noWidgetSession: true });
    novuClient = initNovuClassSdk(session);
  });

  describe('List Subscriber Permutations', () => {
    it('should not return subscribers if not matching search params', async () => {
      await createSubscriberAndValidate('XYZ');
      await createSubscriberAndValidate('XYZ2');
      const subscribers = await getAllAndValidate({
        searchParams: { email: 'nonexistent@email.com' },
        expectedTotalResults: 0,
        expectedArraySize: 0,
      });
      expect(subscribers).to.be.empty;
    });

    it('should return results without any filter params', async () => {
      const uuid = generateUUID();
      await createSubscribers(uuid, 10);
      await getAllAndValidate({
        limit: 15,
        expectedTotalResults: 10,
        expectedArraySize: 10,
      });
    });

    it('should page subscribers without overlap using cursors', async () => {
      const uuid = generateUUID();
      await createSubscribers(uuid, 10);

      const firstPage = await getListSubscribers({
        limit: 5,
      });

      const secondPage = await getListSubscribers({
        after: firstPage.next || undefined,
        limit: 5,
      });

      const idsDeduplicated = buildIdSet(firstPage.data, secondPage.data);
      expect(idsDeduplicated.size).to.be.equal(10);
    });
  });

  describe('List Subscriber Search Filters', () => {
    it('should find subscriber by email', async () => {
      const uuid = generateUUID();
      await createSubscriberAndValidate(uuid);

      const subscribers = await getAllAndValidate({
        searchParams: { email: `test-${uuid}@subscriber.com` },
        expectedTotalResults: 1,
        expectedArraySize: 1,
      });

      expect(subscribers[0].email).to.contain(uuid);
    });

    it('should find subscriber by phone', async () => {
      const uuid = generateUUID();
      await createSubscriberAndValidate(uuid);

      const subscribers = await getAllAndValidate({
        searchParams: { phone: '1234567' },
        expectedTotalResults: 0,
        expectedArraySize: 0,
      });

      const subscribers2 = await getAllAndValidate({
        searchParams: { phone: '+1234567890' },
        expectedTotalResults: 1,
        expectedArraySize: 1,
      });

      expect(subscribers2[0].phone).to.equal('+1234567890');
    });

    it('should find subscriber by full name', async () => {
      const uuid = generateUUID();
      await createSubscriberAndValidate(uuid);

      const subscribers = await getAllAndValidate({
        searchParams: { name: `Test ${uuid} Subscriber` },
        expectedTotalResults: 1,
        expectedArraySize: 1,
      });

      expect(subscribers[0].firstName).to.equal(`Test ${uuid}`);
      expect(subscribers[0].lastName).to.equal('Subscriber');
    });

    it('should find subscriber by subscriberId', async () => {
      const uuid = generateUUID();
      await createSubscriberAndValidate(uuid);

      const subscribers = await getAllAndValidate({
        searchParams: { subscriberId: `test-subscriber-${uuid}` },
        expectedTotalResults: 1,
        expectedArraySize: 1,
      });

      expect(subscribers[0].subscriberId).to.equal(`test-subscriber-${uuid}`);
    });
  });

  describe('List Subscriber Cursor Pagination', () => {
    it('should paginate forward using after cursor', async () => {
      const uuid = generateUUID();
      await createSubscribers(uuid, 10);

      const firstPage = await getListSubscribers({
        limit: 5,
      });

      const secondPage = await getListSubscribers({
        after: firstPage.next || undefined,
        limit: 5,
      });

      expect(firstPage.data).to.have.lengthOf(5);
      expect(secondPage.data).to.have.lengthOf(5);
      expect(firstPage.next).to.exist;
      expect(secondPage.previous).to.exist;

      const idsDeduplicated = buildIdSet(firstPage.data, secondPage.data);
      expect(idsDeduplicated.size).to.equal(10);
    });

    it('should paginate backward using before cursor', async () => {
      const uuid = generateUUID();
      await createSubscribers(uuid, 10);

      const firstPage = await getListSubscribers({
        limit: 5,
      });

      const secondPage = await getListSubscribers({
        after: firstPage.next || undefined,
        limit: 5,
      });

      const previousPage = await getListSubscribers({
        before: secondPage.previous || undefined,
        limit: 5,
      });

      expect(previousPage.data).to.have.lengthOf(5);
      expect(previousPage.next).to.exist;
      expect(previousPage.data).to.deep.equal(firstPage.data);
    });

    it('should handle pagination with limit=1', async () => {
      const uuid = generateUUID();
      await createSubscribers(uuid, 10);

      const firstPage = await getListSubscribers({
        limit: 1,
      });

      expect(firstPage.data).to.have.lengthOf(1);
      expect(firstPage.next).to.exist;
      expect(firstPage.previous).to.not.exist;
    });
  });

  describe('List Subscriber Sorting', () => {
    it('should sort subscribers by _id in ascending order', async () => {
      const uuid = generateUUID();
      await createSubscribers(uuid, 10);

      const response = await getListSubscribers({
        orderBy: '_id',
        orderDirection: OrderDirection.Asc,
        limit: 10,
      });

      const ids = response.data.map((sub) => sub.id).filter((id) => id !== undefined);
      const sortedIds = [...ids].sort((a, b) => a.localeCompare(b));
      expect(ids).to.deep.equal(sortedIds);
    });

    it('should sort subscribers by _id in descending order', async () => {
      const uuid = generateUUID();
      await createSubscribers(uuid, 10);

      const response = await getListSubscribers({
        orderBy: '_id',
        orderDirection: OrderDirection.Desc,
        limit: 10,
      });

      const ids = response.data.map((sub) => sub.id).filter((id) => id !== undefined);
      const sortedIds = [...ids].sort((a, b) => b.localeCompare(a));
      expect(ids).to.deep.equal(sortedIds);
    });

    it('should maintain sort order across pages', async () => {
      const uuid = generateUUID();
      await createSubscribers(uuid, 10);

      const firstPage = await getListSubscribers({
        orderBy: '_id',
        orderDirection: OrderDirection.Desc,
        limit: 5,
      });

      const secondPage = await getListSubscribers({
        orderBy: '_id',
        orderDirection: OrderDirection.Desc,
        after: firstPage.next || undefined,
        limit: 5,
      });

      const allIds = [...firstPage.data.map((sub) => sub.id), ...secondPage.data.map((sub) => sub.id)];
      const sortedIds = [...allIds].sort((a, b) => (!a || !b ? 0 : b.localeCompare(a)));
      expect(allIds).to.deep.equal(sortedIds);
    });
  });
  async function createSubscriberAndValidate(nameSuffix: string = '') {
    const createSubscriberDto = {
      subscriberId: `test-subscriber-${nameSuffix}`,
      firstName: `Test ${nameSuffix}`,
      lastName: 'Subscriber',
      email: `test-${nameSuffix}@subscriber.com`,
      phone: '+1234567890',
    };

    const res = await novuClient.subscribers.create(createSubscriberDto);

    const subscriber = res.result;
    validateCreateSubscriberResponse(subscriber, createSubscriberDto);

    return subscriber;
  }

  async function createSubscribers(uuid: string, numberOfSubscribers: number) {
    for (let i = 0; i < numberOfSubscribers; i += 1) {
      await createSubscriberAndValidate(`${uuid}-${i}`);
    }
  }

  async function getListSubscribers(params: SubscribersControllerSearchSubscribersRequest = {}) {
    const res = await novuClient.subscribers.search(params);

    return res.result;
  }

  interface IAllAndValidate {
    msgPrefix?: string;
    searchParams?: SubscribersControllerSearchSubscribersRequest;
    limit?: number;
    expectedTotalResults: number;
    expectedArraySize: number;
  }

  async function getAllAndValidate({
    msgPrefix = '',
    searchParams = {},
    limit = 15,
    expectedTotalResults,
    expectedArraySize,
  }: IAllAndValidate) {
    const listResponse = await getListSubscribers({
      ...searchParams,
      limit,
    });
    const summary = buildLogMsg(
      {
        msgPrefix,
        searchParams,
        expectedTotalResults,
        expectedArraySize,
      },
      listResponse
    );

    expect(listResponse.data).to.be.an('array', summary);
    expect(listResponse.data).lengthOf(expectedArraySize, `subscribers length ${summary}`);

    return listResponse.data;
  }

  function buildLogMsg(params: IAllAndValidate, listResponse: any): string {
    return `Log - msgPrefix: ${params.msgPrefix}, 
  searchParams: ${JSON.stringify(params.searchParams || 'Not specified', null, 2)}, 
  expectedTotalResults: ${params.expectedTotalResults ?? 'Not specified'}, 
  expectedArraySize: ${params.expectedArraySize ?? 'Not specified'}
  response: 
  ${JSON.stringify(listResponse || 'Not specified', null, 2)}`;
  }

  function buildIdSet(listResponse1: any[], listResponse2: any[]) {
    const extractIDs1 = extractIDs(listResponse1);
    const extractIDs2 = extractIDs(listResponse2);

    return new Set([...extractIDs1, ...extractIDs2]);
  }

  function extractIDs(subscribers: SubscriberResponseDto[]) {
    return subscribers.map((subscriber) => subscriber.id);
  }

  function generateUUID(): string {
    const randomHex = () => randomBytes(2).toString('hex');

    return `${randomHex()}${randomHex()}-${randomHex()}-${randomHex()}-${randomHex()}-${randomHex()}${randomHex()}${randomHex()}`;
  }

  function validateCreateSubscriberResponse(subscriber: SubscriberResponseDto, createDto: any) {
    expect(subscriber).to.be.ok;
    expect(subscriber.id).to.be.ok;
    expect(subscriber.subscriberId).to.equal(createDto.subscriberId);
    expect(subscriber.firstName).to.equal(createDto.firstName);
    expect(subscriber.lastName).to.equal(createDto.lastName);
    expect(subscriber.email).to.equal(createDto.email);
    expect(subscriber.phone).to.equal(createDto.phone);
  }
});
