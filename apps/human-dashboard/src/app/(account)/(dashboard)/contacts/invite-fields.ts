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

  // Same split as `human invite --name`: the first word is the first name, the rest the last name.
  const spaceAt = name.indexOf(' ');

  return {
    fields:
      spaceAt === -1
        ? { contactId, firstName: name }
        : { contactId, firstName: name.slice(0, spaceAt), lastName: name.slice(spaceAt + 1) },
  };
}
