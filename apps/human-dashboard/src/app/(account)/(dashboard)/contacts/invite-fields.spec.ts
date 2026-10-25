import { describe, expect, it } from 'vitest';

import {
  clearFilledInviteErrors,
  contactIdFromName,
  initialInviteDraft,
  inviteDraftFromId,
  inviteDraftFromName,
  parseInviteFields,
} from './invite-fields';

describe('contactIdFromName', () => {
  it('lowercases and turns each run of spaces into one dash', () => {
    expect(contactIdFromName('John Doe')).toBe('john-doe');
    expect(contactIdFromName('John   Doe')).toBe('john-doe');
    expect(contactIdFromName('  John Doe  ')).toBe('john-doe');
  });

  it('keeps dots, underscores and dashes, and drops everything else', () => {
    expect(contactIdFromName("Mary-Jane O'Brien")).toBe('mary-jane-obrien');
    expect(contactIdFromName('John_Doe')).toBe('john_doe');
    expect(contactIdFromName('John.Doe')).toBe('john.doe');
    expect(contactIdFromName('John - Doe')).toBe('john-doe');
  });

  it('folds accents and drops letters that do not decompose', () => {
    expect(contactIdFromName('José García')).toBe('jose-garcia');
    expect(contactIdFromName('Straße')).toBe('strae');
    expect(contactIdFromName('ø')).toBe('');
  });

  it('strips a leading or trailing separator so the id can start with a letter or number', () => {
    expect(contactIdFromName('.John')).toBe('john');
    expect(contactIdFromName('_hidden')).toBe('hidden');
    expect(contactIdFromName('---')).toBe('');
    expect(contactIdFromName('123 John')).toBe('123-john');
  });

  it('is empty when the name has no usable characters', () => {
    expect(contactIdFromName('')).toBe('');
    expect(contactIdFromName('   ')).toBe('');
    expect(contactIdFromName('!!!')).toBe('');
  });

  it('stays within the id length and still passes the form rules', () => {
    const words = 'a '.repeat(80);

    expect(contactIdFromName('a'.repeat(200))).toHaveLength(128);
    expect(contactIdFromName(words).length).toBeLessThanOrEqual(128);
    expect(contactIdFromName(words).endsWith('-')).toBe(false);

    const id = contactIdFromName('José García');

    expect(parseInviteFields({ contactId: id, name: 'José García' }).fields).toEqual({
      contactId: 'jose-garcia',
      firstName: 'José',
      lastName: 'García',
    });
  });
});

describe('invite draft', () => {
  it('fills the id from the name until the id is edited', () => {
    const named = inviteDraftFromName(initialInviteDraft(), 'John Doe');

    expect(named).toEqual({ name: 'John Doe', contactId: 'john-doe', idCustomized: false });

    const edited = inviteDraftFromId(named, 'johnny');

    expect(edited).toEqual({ name: 'John Doe', contactId: 'johnny', idCustomized: true });
    expect(inviteDraftFromName(edited, 'Jane Doe')).toEqual({
      name: 'Jane Doe',
      contactId: 'johnny',
      idCustomized: true,
    });
  });

  it('keeps filling off after the id is cleared, until the name is emptied', () => {
    const edited = inviteDraftFromId(inviteDraftFromName(initialInviteDraft(), 'John Doe'), '');
    const stillOff = inviteDraftFromName(edited, 'Jane Doe');

    expect(stillOff).toEqual({ name: 'Jane Doe', contactId: '', idCustomized: true });

    const reset = inviteDraftFromName(stillOff, '   ');

    expect(reset).toEqual({ name: '   ', contactId: '', idCustomized: false });
    expect(inviteDraftFromName(reset, 'Ada Lovelace')).toEqual({
      name: 'Ada Lovelace',
      contactId: 'ada-lovelace',
      idCustomized: false,
    });
  });

  it('keeps a prefilled id, and derives one when only the name was given', () => {
    expect(initialInviteDraft()).toEqual({ name: '', contactId: '', idCustomized: false });
    expect(initialInviteDraft({ name: 'John Doe' })).toEqual({
      name: 'John Doe',
      contactId: 'john-doe',
      idCustomized: false,
    });
    expect(initialInviteDraft({ name: 'John Doe', contactId: 'johnny' })).toEqual({
      name: 'John Doe',
      contactId: 'johnny',
      idCustomized: true,
    });
  });

  it('clears the empty-id error once the name has filled one', () => {
    const errors = { contactId: 'Enter an ID.', name: 'Enter their full name.' };
    const filled = inviteDraftFromName(initialInviteDraft(), 'John Doe');

    expect(clearFilledInviteErrors(errors, filled)).toEqual({});
    expect(clearFilledInviteErrors(errors, inviteDraftFromName(initialInviteDraft(), '!!!'))).toEqual({
      contactId: 'Enter an ID.',
    });
  });

  it('keeps an id format error when the name changes and the id stays invalid', () => {
    const errors = {
      contactId: 'Use lowercase letters, numbers, dashes, dots or underscores, with no spaces.',
    };
    const custom = inviteDraftFromId(inviteDraftFromName(initialInviteDraft(), 'John Doe'), 'John!');
    const renamed = inviteDraftFromName(custom, 'Jane Doe');

    expect(renamed.contactId).toBe('John!');
    expect(clearFilledInviteErrors(errors, renamed)).toEqual(errors);
  });
});
