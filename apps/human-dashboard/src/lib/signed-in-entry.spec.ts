import { describe, expect, it } from 'vitest';

import { entryNeedsClerk, hasClerkSessionHint, isSignedInEntry, signedInEntryDestination } from './signed-in-entry';

function jar(values: Record<string, string>) {
  return {
    get(name: string) {
      const value = values[name];

      return value === undefined ? undefined : { value };
    },
  };
}

describe('isSignedInEntry', () => {
  it('is the homepage and the people page, with or without a trailing slash', () => {
    expect(isSignedInEntry('/')).toBe(true);
    expect(isSignedInEntry('/sapien')).toBe(true);
    expect(isSignedInEntry('/sapien/')).toBe(true);
    expect(isSignedInEntry('/sapien/opengraph-image.jpg')).toBe(false);
    expect(isSignedInEntry('/index.md')).toBe(false);
    expect(isSignedInEntry('/inbox')).toBe(false);
  });
});

describe('hasClerkSessionHint', () => {
  it('is quiet for a visitor with no Clerk cookies', () => {
    expect(hasClerkSessionHint(jar({}))).toBe(false);
  });

  it('treats Clerk’s signed-out marker as signed out', () => {
    expect(hasClerkSessionHint(jar({ __client_uat: '0' }))).toBe(false);
  });

  it('notices a session token or a signed-in client timestamp', () => {
    expect(hasClerkSessionHint(jar({ __session: 'token' }))).toBe(true);
    expect(hasClerkSessionHint(jar({ __client_uat: '1700000000' }))).toBe(true);
  });
});

describe('entryNeedsClerk', () => {
  it('asks Clerk only on an entry page, with keys and a session hint', () => {
    const cookies = jar({ __session: 'token' });

    expect(entryNeedsClerk('/', cookies, true)).toBe(true);
    expect(entryNeedsClerk('/sapien', cookies, true)).toBe(true);
    expect(entryNeedsClerk('/sapien/', cookies, true)).toBe(true);
    expect(entryNeedsClerk('/', cookies, false)).toBe(false);
    expect(entryNeedsClerk('/sapien', cookies, false)).toBe(false);
    expect(entryNeedsClerk('/', jar({}), true)).toBe(false);
    expect(entryNeedsClerk('/inbox', cookies, true)).toBe(false);
    expect(entryNeedsClerk('/index.md', cookies, true)).toBe(false);
  });
});

describe('signedInEntryDestination', () => {
  it('sends a signed-in person to the inbox', () => {
    expect(signedInEntryDestination('/', 'user_123')).toBe('/inbox');
    expect(signedInEntryDestination('/sapien', 'user_123')).toBe('/inbox');
    expect(signedInEntryDestination('/sapien/', 'user_123')).toBe('/inbox');
  });

  it('leaves everyone else on the page', () => {
    expect(signedInEntryDestination('/', null)).toBeNull();
    expect(signedInEntryDestination('/sapien', null)).toBeNull();
    expect(signedInEntryDestination('/sapien', undefined)).toBeNull();
    expect(signedInEntryDestination('/', '')).toBeNull();
    expect(signedInEntryDestination('/index.md', 'user_123')).toBeNull();
  });
});
