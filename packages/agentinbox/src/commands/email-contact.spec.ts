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
const { contactIdFromEmail, isEmailAddress, resolveEmailContact } = await import('./email-contact');
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
  it('finds the contact that has the address, on its profile or its email channel', async () => {
    listContacts
      .mockResolvedValueOnce({ data: [contact('bob', 'bob@acme.com')], next: 'c1' })
      .mockResolvedValueOnce({ data: [contact('ally', undefined, 'Alice@Acme.com')], next: null });

    await expect(resolveEmailContact(client, 'human-relay', 'alice@acme.com')).resolves.toEqual({
      id: 'ally',
      exists: true,
    });
    expect(listContacts).toHaveBeenLastCalledWith(client, { limit: 100, agentIdentifier: 'human-relay', after: 'c1' });
  });

  it('gives a new address the plain id when it is free', async () => {
    await expect(resolveEmailContact(client, 'human-relay', 'alice@acme.com')).resolves.toEqual({
      id: 'alice',
      exists: false,
    });
  });

  it('adds the suffix when another contact already has the plain id', async () => {
    getContact.mockResolvedValue(contact('alice', 'alice@acme.com'));

    const result = await resolveEmailContact(client, 'human-relay', 'alice@gmail.com');

    expect(result.exists).toBe(false);
    expect(result.id).toBe(contactIdFromEmail('alice@gmail.com', true));
  });
});

describe('resolveEmailRecipients', () => {
  it('leaves contact ids alone and swaps addresses for the contacts that have them', async () => {
    listContacts.mockResolvedValue({ data: [contact('ally', 'alice@acme.com')], next: null });

    await expect(resolveEmailRecipients(client, 'human-relay', ['bob', 'alice@acme.com'], false)).resolves.toEqual([
      'bob',
      'ally',
    ]);
    await expect(resolveEmailRecipients(client, 'human-relay', 'bob', false)).resolves.toBe('bob');
    expect(runInvite).not.toHaveBeenCalled();
  });

  it('makes a new address a contact, sends the verification email and stops the send', async () => {
    await expect(resolveEmailRecipients(client, 'human-relay', 'alice@acme.com', false)).rejects.toThrow(
      'Your message was not sent: alice@acme.com is not verified yet'
    );
    expect(runInvite).toHaveBeenCalledWith('alice', { via: 'email', email: 'alice@acme.com', async: true });
  });

  it('refuses an address nobody has in a reply', async () => {
    await expect(resolveEmailRecipients(client, 'human-relay', ['alice@acme.com'], true)).rejects.toThrow(
      'is not one of your contacts'
    );
    expect(runInvite).not.toHaveBeenCalled();
  });
});
