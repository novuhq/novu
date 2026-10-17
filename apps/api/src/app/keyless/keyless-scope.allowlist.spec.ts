import { expect } from 'chai';

import {
  computeKeylessTriggerCost,
  isKeylessApiKeyRequestBodyAllowed,
  isKeylessApiKeyRouteAllowed,
} from './keyless-scope.allowlist';

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
    ['PUT', '/v2/workflows/order-shipped/sync'],
    ['PUT', '/v2/workflows/:workflowId/sync'],
    ['PUT', '/V2/Workflows/order-shipped/Sync/'],
    ['GET', '/'],
    ['GET', ''],
  ];

  for (const [method, path] of blocked) {
    it(`blocks ${method} ${path || '(empty)'}`, () => {
      expect(isKeylessApiKeyRouteAllowed(method, path)).to.equal(false);
    });
  }
});

describe('isKeylessApiKeyRequestBodyAllowed', () => {
  for (const providerId of ['novu-email', 'novu-sms', 'novu-slack', 'NOVU-EMAIL']) {
    it(`blocks creating a ${providerId} integration`, () => {
      expect(isKeylessApiKeyRequestBodyAllowed('POST', '/v1/integrations/', { providerId })).to.equal(false);
    });
  }

  it('allows creating integrations of other providers', () => {
    expect(isKeylessApiKeyRequestBodyAllowed('POST', '/v1/integrations', { providerId: 'telegram' })).to.equal(true);
    expect(isKeylessApiKeyRequestBodyAllowed('POST', '/v1/integrations', { providerId: 'novu' })).to.equal(true);
    expect(isKeylessApiKeyRequestBodyAllowed('POST', '/v1/integrations', undefined)).to.equal(true);
  });

  it('ignores other routes and methods', () => {
    expect(isKeylessApiKeyRequestBodyAllowed('PUT', '/v1/integrations', { providerId: 'novu-email' })).to.equal(true);
    expect(isKeylessApiKeyRequestBodyAllowed('POST', '/v1/events/trigger', { providerId: 'novu-email' })).to.equal(
      true
    );
  });

  const recipientOverrides = [
    { email: { bcc: ['victim@example.com'] } },
    { email: { to: ['victim@example.com'], replaceToRecipient: true } },
    { 'novu-email': { cc: ['victim@example.com'] } },
    { providers: { 'novu-email': { bcc: ['victim@example.com'] } } },
    { steps: { 'email-step': { providers: { 'novu-email': { BCC: ['victim@example.com'] } } } } },
  ];

  for (const overrides of recipientOverrides) {
    it(`blocks trigger recipient overrides ${JSON.stringify(overrides)}`, () => {
      expect(isKeylessApiKeyRequestBodyAllowed('POST', '/v1/events/trigger', { name: 'wf', overrides })).to.equal(
        false
      );
      expect(isKeylessApiKeyRequestBodyAllowed('POST', '/v1/events/trigger/broadcast', { overrides })).to.equal(false);
      expect(
        isKeylessApiKeyRequestBodyAllowed('POST', '/v1/events/trigger/bulk', {
          events: [{ name: 'wf' }, { name: 'wf', overrides }],
        })
      ).to.equal(false);
    });
  }

  it('allows triggers whose overrides add no recipients', () => {
    const overrides = { email: { subject: 'Hi' }, providers: { sendgrid: { ipPoolName: 'pool' } } };

    expect(
      isKeylessApiKeyRequestBodyAllowed('POST', '/v1/events/trigger', { name: 'wf', to: 'a', overrides })
    ).to.equal(true);
    expect(isKeylessApiKeyRequestBodyAllowed('POST', '/v1/events/trigger/bulk', { events: [{ overrides }] })).to.equal(
      true
    );
    expect(isKeylessApiKeyRequestBodyAllowed('POST', '/v1/events/trigger/bulk', { events: 'nope' })).to.equal(true);
  });
});

describe('computeKeylessTriggerCost', () => {
  const recipients = (units: number, topicKeys: string[] = []) => ({ type: 'recipients', units, topicKeys });

  it('is null for routes that are not triggers', () => {
    expect(computeKeylessTriggerCost('GET', '/v1/events/trigger', {})).to.equal(null);
    expect(computeKeylessTriggerCost('DELETE', '/v1/events/trigger/txn-1', {})).to.equal(null);
    expect(computeKeylessTriggerCost('POST', '/v2/workflows', {})).to.equal(null);
  });

  it('counts a single recipient as one unit', () => {
    expect(computeKeylessTriggerCost('POST', '/v1/events/trigger', { to: 'user-1' })).to.deep.equal(recipients(1));
    expect(computeKeylessTriggerCost('POST', '/v1/events/trigger', { to: { subscriberId: 'user-1' } })).to.deep.equal(
      recipients(1)
    );
  });

  it('counts each recipient of a `to` array', () => {
    expect(
      computeKeylessTriggerCost('POST', '/v1/events/trigger/', { to: ['a', 'b', { subscriberId: 'c' }] })
    ).to.deep.equal(recipients(3));
  });

  it('sums the recipients of every bulk event', () => {
    const body = { events: [{ to: ['a', 'b'] }, { to: 'c' }, { to: [{ subscriberId: 'd' }] }] };

    expect(computeKeylessTriggerCost('POST', '/v1/events/trigger/bulk', body)).to.deep.equal(recipients(4));
  });

  it('collects topic recipients so their subscribers are resolved instead of counted as one', () => {
    const topic = { type: 'Topic', topicKey: 'all-users' };

    expect(computeKeylessTriggerCost('POST', '/v1/events/trigger', { to: topic })).to.deep.equal(
      recipients(0, ['all-users'])
    );
    expect(computeKeylessTriggerCost('POST', '/v1/events/trigger', { to: ['a', topic] })).to.deep.equal(
      recipients(1, ['all-users'])
    );
    expect(
      computeKeylessTriggerCost('POST', '/v1/events/trigger/bulk', { events: [{ to: [topic] }, { to: 'b' }] })
    ).to.deep.equal(recipients(1, ['all-users']));
  });

  it('keeps a topic once per bulk event that targets it, since each event fans out separately', () => {
    const topic = { type: 'Topic', topicKey: 'all-users' };
    const body = { events: [{ to: [topic, topic] }, { to: topic }, { to: [topic, 'a'] }] };

    expect(computeKeylessTriggerCost('POST', '/v1/events/trigger/bulk', body)).to.deep.equal(
      recipients(1, ['all-users', 'all-users', 'all-users'])
    );
  });

  it('counts a bulk body without an events array as one unit', () => {
    expect(computeKeylessTriggerCost('POST', '/v1/events/trigger/bulk', { events: 'nope' })).to.deep.equal(
      recipients(1)
    );
  });

  it('marks a broadcast so its cost is resolved against the environment subscribers', () => {
    expect(computeKeylessTriggerCost('POST', '/v1/events/trigger/broadcast', { name: 'wf' })).to.deep.equal({
      type: 'broadcast',
    });
  });

  it('counts a missing body as one unit', () => {
    expect(computeKeylessTriggerCost('POST', '/v1/events/trigger', undefined)).to.deep.equal(recipients(1));
  });
});
