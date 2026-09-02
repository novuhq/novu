import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Contact } from '../api/human';
import type { HumanCliConfig } from '../config';

const listContacts = vi.fn();
const clientFromConfig = vi.fn();

vi.mock('../api/human', () => ({
  listContacts: (...args: unknown[]) => listContacts(...args),
}));

vi.mock('./interact', async (importOriginal) => {
  const original = await importOriginal<typeof import('./interact')>();

  return {
    ...original,
    clientFromConfig: (...args: unknown[]) => clientFromConfig(...args),
  };
});

const { contactsCommand, markSelf, parseContactsLimit, renderContactsTable, displayName } = await import('./contacts');

const config: HumanCliConfig = {
  apiUrl: 'https://api.novu.co',
  auth: { mode: 'apiKey', secretKey: 'key' },
  relayAgentIdentifier: 'human-relay',
  subscriberId: 'human_me',
};

function contact(overrides: Partial<Contact> & { id: string }): Contact {
  return { createdAt: '2026-09-01T00:00:00.000Z', updatedAt: '2026-09-01T00:00:00.000Z', ...overrides };
}

describe('parseContactsLimit', () => {
  it('defaults to 50 and rejects out-of-range values', () => {
    expect(parseContactsLimit(undefined)).toBe(50);
    expect(parseContactsLimit('5')).toBe(5);
    expect(() => parseContactsLimit('0')).toThrow('--limit');
    expect(() => parseContactsLimit('101')).toThrow('--limit');
    expect(() => parseContactsLimit('abc')).toThrow('--limit');
  });
});

describe('markSelf', () => {
  it('flags only the operator row', () => {
    const rows = markSelf([contact({ id: 'alice' }), contact({ id: 'human_me' })], 'human_me');
    expect(rows.map((row) => row.self)).toEqual([false, true]);
  });

  it('flags nothing when the config has no subscriberId', () => {
    const rows = markSelf([contact({ id: 'alice' })], undefined);
    expect(rows[0].self).toBe(false);
  });
});

describe('displayName', () => {
  it('joins first and last name and tolerates either missing', () => {
    expect(displayName(contact({ id: 'a', firstName: 'Alice', lastName: 'Chen' }))).toBe('Alice Chen');
    expect(displayName(contact({ id: 'a', firstName: 'Alice' }))).toBe('Alice');
    expect(displayName(contact({ id: 'a' }))).toBe('');
  });
});

describe('renderContactsTable', () => {
  it('prints an empty-state hint', () => {
    expect(renderContactsTable([], null, 50)).toContain('No contacts found');
  });

  it('marks (you) and hints when more pages exist', () => {
    const out = renderContactsTable(
      markSelf(
        [contact({ id: 'alice', firstName: 'Alice', email: 'a@x.co' }), contact({ id: 'human_me' })],
        'human_me'
      ),
      'cursor-1',
      50
    );
    expect(out).toContain('alice');
    expect(out).toContain('Alice');
    expect(out).toContain('a@x.co');
    expect(out).toContain('(you)');
    expect(out).toContain('More contacts');
    expect(out).toContain('--limit 100');
  });

  it('omits the hint on the last page', () => {
    expect(renderContactsTable(markSelf([contact({ id: 'alice' })], 'human_me'), null, 50)).not.toContain(
      'More contacts'
    );
  });
});

describe('contactsCommand', () => {
  let stdout: string;

  beforeEach(() => {
    stdout = '';
    listContacts.mockReset();
    clientFromConfig.mockReset();
    clientFromConfig.mockReturnValue({ client: {}, config });
    vi.spyOn(process.stdout, 'write').mockImplementation((chunk: string | Uint8Array) => {
      stdout += String(chunk);

      return true;
    });
    vi.spyOn(process, 'exit').mockImplementation(((code?: number) => {
      throw new Error(`exit:${code ?? 0}`);
    }) as never);
  });

  it('prints { data, next } JSON with self markers', async () => {
    listContacts.mockResolvedValue({
      data: [contact({ id: 'human_me', firstName: 'Dima' }), contact({ id: 'alice' })],
      next: 'cursor-2',
    });

    await expect(contactsCommand({ json: true, limit: '10' })).rejects.toThrow('exit:0');

    expect(listContacts).toHaveBeenCalledWith({}, { limit: 10 });
    const parsed = JSON.parse(stdout);
    expect(parsed.next).toBe('cursor-2');
    expect(parsed.data.map((row: { id: string; self: boolean }) => [row.id, row.self])).toEqual([
      ['human_me', true],
      ['alice', false],
    ]);
  });

  it('renders the table by default', async () => {
    listContacts.mockResolvedValue({ data: [contact({ id: 'alice', firstName: 'Alice' })], next: null });

    await expect(contactsCommand({})).rejects.toThrow('exit:0');

    expect(stdout).toContain('alice');
    expect(stdout).toContain('Alice');
    expect(listContacts).toHaveBeenCalledWith({}, { limit: 50 });
  });
});
