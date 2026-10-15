import { expect } from 'chai';

import { computeKeylessTriggerCost, isKeylessApiKeyRouteAllowed } from './keyless-scope.allowlist';

describe('isKeylessApiKeyRouteAllowed', () => {
  const allowed: Array<[string, string]> = [
    ['POST', '/v1/events/trigger'],
    ['POST', '/v1/events/trigger/bulk'],
    ['POST', '/v1/events/trigger/broadcast'],
    ['DELETE', '/v1/events/trigger/txn-1'],
    ['GET', '/v2/workflows'],
    ['POST', '/v2/workflows'],
    ['PUT', '/v2/workflows/order-shipped'],
    ['GET', '/v1/subscribers'],
    ['POST', '/v1/subscribers'],
    ['PATCH', '/v2/subscribers/user-1'],
    ['GET', '/v1/integrations'],
    ['GET', '/v1/messages'],
    ['GET', '/v1/notifications'],
    ['GET', '/v1/activity'],
    ['GET', '/v1/execution-details'],
    ['GET', '/v1/keyless/environments/me'],
    ['GET', '/v1/environments/me'],
    ['GET', '/v1/environments/me/'],
    ['POST', '/V1/Events/Trigger'],
  ];

  for (const [method, path] of allowed) {
    it(`allows ${method} ${path}`, () => {
      expect(isKeylessApiKeyRouteAllowed(method, path)).to.equal(true);
    });
  }

  const blocked: Array<[string, string]> = [
    ['GET', '/v1/environments'],
    ['POST', '/v1/environments'],
    ['GET', '/v1/environments/api-keys'],
    ['PUT', '/v1/environments/me'],
    ['POST', '/v1/environments/me'],
    ['GET', '/v1/users/me'],
    ['GET', '/v1/organizations'],
    ['GET', '/v2/topics'],
    ['POST', '/v1/topics'],
    ['GET', '/v2/contexts'],
    ['POST', '/v1/bridge/sync'],
    ['GET', '/v2/layouts'],
    ['GET', '/v1/workflows'],
    ['POST', '/v1/keyless/environments/claim'],
    ['GET', '/v1/eventsx'],
    ['GET', '/v1/events-other'],
    ['GET', '/v2/workflowsfoo'],
    ['GET', '/v3/workflows'],
    ['GET', '/'],
    ['GET', ''],
  ];

  for (const [method, path] of blocked) {
    it(`blocks ${method} ${path || '(empty)'}`, () => {
      expect(isKeylessApiKeyRouteAllowed(method, path)).to.equal(false);
    });
  }
});

describe('computeKeylessTriggerCost', () => {
  it('is null for routes that are not triggers', () => {
    expect(computeKeylessTriggerCost('GET', '/v1/events/trigger', {})).to.equal(null);
    expect(computeKeylessTriggerCost('DELETE', '/v1/events/trigger/txn-1', {})).to.equal(null);
    expect(computeKeylessTriggerCost('POST', '/v2/workflows', {})).to.equal(null);
  });

  it('counts a single recipient as one unit', () => {
    expect(computeKeylessTriggerCost('POST', '/v1/events/trigger', { to: 'user-1' })).to.equal(1);
    expect(computeKeylessTriggerCost('POST', '/v1/events/trigger', { to: { subscriberId: 'user-1' } })).to.equal(1);
  });

  it('counts each recipient of a `to` array', () => {
    expect(
      computeKeylessTriggerCost('POST', '/v1/events/trigger/', { to: ['a', 'b', { subscriberId: 'c' }] })
    ).to.equal(3);
  });

  it('sums the recipients of every bulk event', () => {
    const body = { events: [{ to: ['a', 'b'] }, { to: 'c' }, { to: [{ subscriberId: 'd' }] }] };

    expect(computeKeylessTriggerCost('POST', '/v1/events/trigger/bulk', body)).to.equal(4);
  });

  it('counts a bulk body without an events array as one unit', () => {
    expect(computeKeylessTriggerCost('POST', '/v1/events/trigger/bulk', { events: 'nope' })).to.equal(1);
  });

  it('counts a broadcast as one unit', () => {
    expect(computeKeylessTriggerCost('POST', '/v1/events/trigger/broadcast', { name: 'wf' })).to.equal(1);
  });

  it('counts a missing body as one unit', () => {
    expect(computeKeylessTriggerCost('POST', '/v1/events/trigger', undefined)).to.equal(1);
  });
});
