import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const client = vi.hoisted(() => ({
  track: vi.fn(),
  alias: vi.fn(),
  people: { set: vi.fn(), union: vi.fn() },
  groups: { set: vi.fn() },
}));

const init = vi.hoisted(() => vi.fn(() => client));

vi.mock('mixpanel', () => ({ default: { init } }));

import { AnalyticsService, ORGANIZATION_GROUP_KEY } from './analytics.service';

describe('AnalyticsService', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    process.env.NODE_ENV = 'production';
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  async function createService(token: string | null = 'token') {
    const service = new AnalyticsService(token);
    await service.initialize();

    return service;
  }

  it('does not initialize Mixpanel or send anything without a token', async () => {
    const service = await createService(null);

    service.track('Event', 'user-1');

    expect(init).not.toHaveBeenCalled();
    expect(client.track).not.toHaveBeenCalled();
  });

  it('sends nothing in the test environment', async () => {
    process.env.NODE_ENV = 'test';
    const service = await createService();

    service.track('Event', 'user-1');

    expect(client.track).not.toHaveBeenCalled();
  });

  it('tracks events with the user as distinct_id', async () => {
    const service = await createService();

    service.track('Workflow created', 'user-1', { _organization: 'org-1', distinct_id: 'ignored' });
    service.mixpanelTrack('Legacy event', 'user-2');

    expect(client.track).toHaveBeenCalledWith(
      'Workflow created',
      { _organization: 'org-1', distinct_id: 'user-1' },
      expect.any(Function)
    );
    expect(client.track).toHaveBeenCalledWith('Legacy event', { distinct_id: 'user-2' }, expect.any(Function));
  });

  it('maps user traits to Mixpanel profile properties', async () => {
    const service = await createService();

    service.upsertUser(
      { _id: 'user-1', firstName: 'Ada', lastName: 'Lovelace', email: 'ada@example.com', createdAt: '0' },
      'user-1',
      { jobTitle: 'engineer' }
    );
    service.setValue('user-1', 'email', 'new@example.com');

    expect(client.people.set).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({
        $first_name: 'Ada',
        $last_name: 'Lovelace',
        $name: 'Ada Lovelace',
        $email: 'ada@example.com',
        $created: new Date(0).toISOString(),
        jobTitle: 'engineer',
      }),
      expect.any(Function)
    );
    expect(client.people.set).toHaveBeenCalledWith('user-1', { $email: 'new@example.com' }, expect.any(Function));
  });

  it('sets organization group properties and links the user to the group', async () => {
    const service = await createService();

    service.upsertGroup(
      'org-1',
      { name: 'Acme', createdAt: '0', productUseCases: { in_app: true, digest: false } } as never,
      { _id: 'user-1' }
    );

    expect(client.groups.set).toHaveBeenCalledWith(
      ORGANIZATION_GROUP_KEY,
      'org-1',
      expect.objectContaining({ $name: 'Acme', productUseCases: ['in_app'] }),
      expect.any(Function)
    );
    expect(client.people.union).toHaveBeenCalledWith(
      'user-1',
      { [ORGANIZATION_GROUP_KEY]: ['org-1'] },
      expect.any(Function)
    );
  });

  it('aliases the previous id to the user id', async () => {
    const service = await createService();

    service.alias('anonymous-1', 'user-1');

    expect(client.alias).toHaveBeenCalledWith('anonymous-1', 'user-1', expect.any(Function));
  });

  it('does not throw when the Mixpanel client throws', async () => {
    const service = await createService();
    client.track.mockImplementationOnce(() => {
      throw new Error('boom');
    });

    expect(() => service.track('Event', 'user-1')).not.toThrow();
  });
});
