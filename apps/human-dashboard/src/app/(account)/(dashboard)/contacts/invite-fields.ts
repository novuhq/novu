/** `subscriberId` and the name fields of the API's `CreateHumanInviteRequestDto` all stop at 128 characters. */
const MAX_LENGTH = 128;

/** The API takes any non-empty id; agents type it after `--to`, so it's kept to what's easy to type there. */
const CONTACT_ID_PATTERN = /^[a-z0-9][a-z0-9._-]*$/;

export type InviteFieldErrors = { contactId?: string; name?: string };

export type InviteFields = { contactId: string; firstName: string; lastName?: string };

/** Checks the "Invite someone" form. Runs in the browser for quick feedback and again in the server action. */
export function parseInviteFields(input: {
  contactId: string;
  name: string;
}): { fields: InviteFields; errors?: undefined } | { fields?: undefined; errors: InviteFieldErrors } {
  const contactId = input.contactId.trim();
  const name = input.name.trim().replace(/\s+/g, ' ');
  const errors: InviteFieldErrors = {};

  if (!contactId) {
    errors.contactId = 'Enter an ID.';
  } else if (contactId.length > MAX_LENGTH) {
    errors.contactId = `Keep the ID under ${MAX_LENGTH} characters.`;
  } else if (!CONTACT_ID_PATTERN.test(contactId)) {
    errors.contactId = 'Use lowercase letters, numbers, dashes, dots or underscores, with no spaces.';
  }

  if (!name) {
    errors.name = 'Enter their full name.';
  } else if (name.length > MAX_LENGTH) {
    errors.name = `Keep the name under ${MAX_LENGTH} characters.`;
  }

  if (errors.contactId || errors.name) {
    return { errors };
  }

  // Same split as `contact invite --name`: the first word is the first name, the rest the last name.
  const spaceAt = name.indexOf(' ');

  return {
    fields:
      spaceAt === -1
        ? { contactId, firstName: name }
        : { contactId, firstName: name.slice(0, spaceAt), lastName: name.slice(spaceAt + 1) },
  };
}

/** The invite form while it is open: the name, the id, and whether that id was typed by hand. */
export type InviteDraft = {
  name: string;
  contactId: string;
  /** Once true, typing in the name leaves the id alone until the name is cleared. */
  idCustomized: boolean;
};

/**
 * The id the form fills in from a full name. Accents fold to plain letters, spaces become one dash,
 * and anything an agent could not type after `--to` is left out. Empty when nothing usable remains.
 */
export function contactIdFromName(name: string): string {
  let slug = name
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9._-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^[._-]+|[._-]+$/g, '');

  if (slug.length > MAX_LENGTH) {
    slug = slug.slice(0, MAX_LENGTH).replace(/[._-]+$/g, '');
  }

  if (!CONTACT_ID_PATTERN.test(slug)) {
    return '';
  }

  return slug;
}

/** A fresh form, or one reopened with what was already entered. A prefilled id is kept as typed. */
export function initialInviteDraft(start?: { name?: string; contactId?: string }): InviteDraft {
  const name = start?.name ?? '';
  const contactId = start?.contactId ?? '';

  if (contactId.trim()) {
    return { name, contactId, idCustomized: true };
  }

  if (name.trim()) {
    return inviteDraftFromName({ name: '', contactId: '', idCustomized: false }, name);
  }

  return { name: '', contactId: '', idCustomized: false };
}

/** Applies a change to the full name. An empty name clears the id and lets the next name fill it again. */
export function inviteDraftFromName(draft: InviteDraft, name: string): InviteDraft {
  if (!name.trim()) {
    return { name, contactId: '', idCustomized: false };
  }

  if (draft.idCustomized) {
    return { ...draft, name };
  }

  return { name, contactId: contactIdFromName(name), idCustomized: false };
}

/** Applies a change to the id. The name stays as it is, and the name stops filling the id. */
export function inviteDraftFromId(draft: InviteDraft, contactId: string): InviteDraft {
  return { ...draft, contactId, idCustomized: true };
}

/** Drops a field's error once that field is valid, so a filled id is not still "Enter an ID." */
export function clearFilledInviteErrors(errors: InviteFieldErrors, draft: InviteDraft): InviteFieldErrors {
  const parsed = parseInviteFields(draft);

  if (!parsed.errors) {
    return {};
  }

  return {
    ...(parsed.errors.contactId && errors.contactId ? { contactId: errors.contactId } : {}),
    ...(parsed.errors.name && errors.name ? { name: errors.name } : {}),
  };
}
