import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Contact } from '../api/agent-inbox';

const listContacts = vi.fn();
const getContact = vi.fn();
const runInvite = vi.fn();

vi.mock('../api/agent-inbox', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/agent-inbox')>()),
  listContacts: (...args: unknown[]) => listContacts(...args),
  getContact: (...args: unknown[]) => getContact(...args),
}));

vi.mock('./invite', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./invite')>()),
  runInvite: (...args: unknown[]) => runInvite(...args),
}));

vi.mock('../output', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../output')>()),
  fail: (message: string) => {
    throw new Error(message);
  },
}));

const { ApiError } = await import('../api/client');
const { contactIdFromEmail, isEmailAddress, maskEmail, resolveEmailContact } = await import('./email-contact');
const { resolveEmailRecipients } = await import('./interact');

const client = {} as never;
const notFound = new ApiError('Contact not found', 404, 'GET /v1/human/contacts/x', {});

function contact(id: string, email?: string, channelAddress?: string): Contact {
  return {
    id,
    ...(email ? { email } : {}),
    ...(channelAddress ? { channels: [{ via: 'email', status: 'verified', address: channelAddress }] } : {}),
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
  };
}

beforeEach(() => {
  listContacts.mockResolvedValue({ data: [], next: null });
  getContact.mockRejectedValue(notFound);
});

afterEach(() => {
  vi.resetAllMocks();
});

describe('contactIdFromEmail', () => {
  it('uses the part before the @, lowercased, with only safe characters', () => {
    expect(contactIdFromEmail('Alice@Acme.com')).toBe('alice');
    expect(contactIdFromEmail('john.doe+ci@acme.com')).toBe('john.doe-ci');
  });

  it('adds a short suffix that stays the same for the same address', () => {
    const first = contactIdFromEmail('alice@gmail.com', true);

    expect(first).toMatch(/^alice-[0-9a-f]{6}$/);
    expect(contactIdFromEmail('ALICE@gmail.com', true)).toBe(first);
    expect(contactIdFromEmail('alice@acme.com', true)).not.toBe(first);
  });
});

describe('isEmailAddress', () => {
  it('tells an address from a contact id', () => {
    expect(isEmailAddress('alice@acme.com')).toBe(true);
    expect(isEmailAddress('alice')).toBe(false);
  });
});

describe('resolveEmailContact', () => {
  it('finds the contact this relay verified the address for, across pages', async () => {
    listContacts
      .mockResolvedValueOnce({ data: [contact('bob', undefined, 'bob@acme.com')], next: 'c1' })
      .mockResolvedValueOnce({ data: [contact('ally', undefined, 'Alice@Acme.com')], next: null });

    await expect(resolveEmailContact(client, 'human-relay', 'alice@acme.com')).resolves.toEqual({
      id: 'ally',
      exists: true,
    });
    expect(listContacts).toHaveBeenLastCalledWith(client, { limit: 100, agentIdentifier: 'human-relay', after: 'c1' });
  });

  it('never takes a profile email as proof of the address', async () => {
    listContacts.mockResolvedValue({ data: [contact('mallory', 'alice@acme.com')], next: null });

    await expect(resolveEmailContact(client, 'human-relay', 'alice@acme.com')).resolves.toEqual({
      id: 'alice',
      exists: false,
    });
  });

  it('refuses to pick when the address is verified for two contacts', async () => {
    listContacts.mockResolvedValue({
      data: [contact('ally', undefined, 'alice@acme.com'), contact('alice', undefined, 'alice@acme.com')],
      next: null,
    });

    await expect(resolveEmailContact(client, 'human-relay', 'alice@acme.com')).rejects.toThrow(
      'verified for more than one contact (ally, alice)'
    );
  });

  it('gives a new address the plain id when it is free', async () => {
    await expect(resolveEmailContact(client, 'human-relay', 'alice@acme.com')).resolves.toEqual({
      id: 'alice',
      exists: false,
    });
  });

  it('reuses the contact an earlier invite made for the same address while it waits for the click', async () => {
    getContact.mockResolvedValue({
      ...contact('alice'),
      channels: [{ via: 'email', status: 'pending', address: maskEmail('alice@acme.com') }],
    });

    await expect(resolveEmailContact(client, 'human-relay', 'alice@acme.com')).resolves.toEqual({
      id: 'alice',
      exists: false,
    });
  });

  it('adds the suffix when another contact already has the plain id', async () => {
    getContact.mockImplementation(async (_client: unknown, id: string) => {
      if (id === 'alice') {
        return contact('alice', undefined, 'alice@acme.com');
      }

      throw notFound;
    });

    const result = await resolveEmailContact(client, 'human-relay', 'alice@gmail.com');

    expect(result).toEqual({ id: contactIdFromEmail('alice@gmail.com', true), exists: false });
  });

  it('skips an id another new address in the same command took', async () => {
    const result = await resolveEmailContact(client, 'human-relay', 'alice@gmail.com', new Set(['alice']));

    expect(result).toEqual({ id: contactIdFromEmail('alice@gmail.com', true), exists: false });
  });
});

describe('resolveEmailRecipients', () => {
  it('leaves contact ids alone and swaps addresses for the contacts that have them', async () => {
    listContacts.mockResolvedValue({ data: [contact('ally', undefined, 'alice@acme.com')], next: null });

    await expect(resolveEmailRecipients(client, 'human-relay', ['bob', 'alice@acme.com'], false)).resolves.toEqual([
      'bob',
      'ally',
    ]);
    await expect(resolveEmailRecipients(client, 'human-relay', 'bob', false)).resolves.toBe('bob');
    expect(runInvite).not.toHaveBeenCalled();
  });

  it('makes a new address a contact on the same API, sends the verification email and stops the send', async () => {
    const onApi = { apiUrl: 'https://eu.api.example' } as never;

    await expect(resolveEmailRecipients(onApi, 'human-relay', 'alice@acme.com', false)).rejects.toThrow(
      'Your message was not sent: alice@acme.com is not verified yet'
    );
    expect(runInvite).toHaveBeenCalledWith('alice', {
      via: 'email',
      email: 'alice@acme.com',
      async: true,
      apiUrl: 'https://eu.api.example',
    });
  });

  it('gives two new addresses with the same name two contacts', async () => {
    await expect(
      resolveEmailRecipients(client, 'human-relay', ['alice@acme.com', 'alice@gmail.com'], false)
    ).rejects.toThrow('alice@acme.com, alice@gmail.com are not verified yet');
    expect(runInvite.mock.calls.map(([id]) => id)).toEqual(['alice', contactIdFromEmail('alice@gmail.com', true)]);
  });

  it('refuses an address nobody has in a reply', async () => {
    await expect(resolveEmailRecipients(client, 'human-relay', ['alice@acme.com'], true)).rejects.toThrow(
      'is not one of your contacts'
    );
    expect(runInvite).not.toHaveBeenCalled();
  });
});
