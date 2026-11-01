import { describe, expect, it } from 'vitest';

import { hasClerkSessionHint, isSapienPage, sapienNeedsClerk, sapienSignedInDestination } from './sapien-entry';

function jar(values: Record<string, string>) {
  return {
    get(name: string) {
      const value = values[name];

      return value === undefined ? undefined : { value };
    },
  };
}

describe('isSapienPage', () => {
  it('is the people page, with or without a trailing slash', () => {
    expect(isSapienPage('/sapien')).toBe(true);
    expect(isSapienPage('/sapien/')).toBe(true);
    expect(isSapienPage('/sapien/opengraph-image.jpg')).toBe(false);
    expect(isSapienPage('/')).toBe(false);
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

describe('sapienNeedsClerk', () => {
  it('asks Clerk only on the people page, with keys and a session hint', () => {
    const cookies = jar({ __session: 'token' });

    expect(sapienNeedsClerk('/sapien', cookies, true)).toBe(true);
    expect(sapienNeedsClerk('/sapien/', cookies, true)).toBe(true);
    expect(sapienNeedsClerk('/sapien', cookies, false)).toBe(false);
    expect(sapienNeedsClerk('/sapien', jar({}), true)).toBe(false);
    expect(sapienNeedsClerk('/inbox', cookies, true)).toBe(false);
  });
});

describe('sapienSignedInDestination', () => {
  it('sends a signed-in person to the inbox', () => {
    expect(sapienSignedInDestination('/sapien', 'user_123')).toBe('/inbox');
    expect(sapienSignedInDestination('/sapien/', 'user_123')).toBe('/inbox');
  });

  it('leaves everyone else on the page', () => {
    expect(sapienSignedInDestination('/sapien', null)).toBeNull();
    expect(sapienSignedInDestination('/sapien', undefined)).toBeNull();
    expect(sapienSignedInDestination('/sapien', '')).toBeNull();
    expect(sapienSignedInDestination('/', 'user_123')).toBeNull();
  });
});
