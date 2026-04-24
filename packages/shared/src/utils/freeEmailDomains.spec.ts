import { describe, expect, it } from 'vitest';
import {
  DISPOSABLE_EMAIL_DOMAINS,
  FREE_EMAIL_DOMAINS,
  isBusinessEmail,
  isDisposableEmail,
  isFreeEmail,
} from './freeEmailDomains';

describe('FREE_EMAIL_DOMAINS', () => {
  it('should contain all expected free email domains', () => {
    const expectedDomains = [
      'gmail.com',
      'googlemail.com',
      'yahoo.com',
      'hotmail.com',
      'outlook.com',
      'live.com',
      'icloud.com',
      'proton.me',
      'protonmail.com',
      '163.com',
      'qq.com',
      'mail.ru',
      'aol.com',
    ];

    for (const domain of expectedDomains) {
      expect(FREE_EMAIL_DOMAINS.has(domain)).toBe(true);
    }
  });
});

describe('DISPOSABLE_EMAIL_DOMAINS', () => {
  it('should contain all expected disposable email domains', () => {
    const expectedDomains = [
      'minitts.net',
      'azsc.us',
      'emaildisruptor.com',
      'skymail.ink',
      'tutamail.com',
      'kksk.uk',
      'gtempaccount.com',
      'privaterelay.appleid.com',
    ];

    for (const domain of expectedDomains) {
      expect(DISPOSABLE_EMAIL_DOMAINS.has(domain)).toBe(true);
    }
  });
});

describe('isFreeEmail', () => {
  it('should return true for free email providers', () => {
    expect(isFreeEmail('user@gmail.com')).toBe(true);
    expect(isFreeEmail('user@yahoo.com')).toBe(true);
    expect(isFreeEmail('user@hotmail.com')).toBe(true);
    expect(isFreeEmail('user@outlook.com')).toBe(true);
    expect(isFreeEmail('user@icloud.com')).toBe(true);
    expect(isFreeEmail('user@proton.me')).toBe(true);
    expect(isFreeEmail('user@protonmail.com')).toBe(true);
    expect(isFreeEmail('user@163.com')).toBe(true);
    expect(isFreeEmail('user@qq.com')).toBe(true);
    expect(isFreeEmail('user@mail.ru')).toBe(true);
    expect(isFreeEmail('user@aol.com')).toBe(true);
  });

  it('should be case-insensitive', () => {
    expect(isFreeEmail('user@Gmail.com')).toBe(true);
    expect(isFreeEmail('user@YAHOO.COM')).toBe(true);
  });

  it('should return true for .edu. university domains', () => {
    expect(isFreeEmail('student@cs.edu.au')).toBe(true);
    expect(isFreeEmail('student@mail.edu.cn')).toBe(true);
    expect(isFreeEmail('student@university.edu.uk')).toBe(true);
  });

  it('should return false for business email domains', () => {
    expect(isFreeEmail('user@novu.co')).toBe(false);
    expect(isFreeEmail('user@company.com')).toBe(false);
    expect(isFreeEmail('user@acme.io')).toBe(false);
  });
});

describe('isDisposableEmail', () => {
  it('should return true for disposable email providers', () => {
    expect(isDisposableEmail('user@minitts.net')).toBe(true);
    expect(isDisposableEmail('user@azsc.us')).toBe(true);
    expect(isDisposableEmail('user@emaildisruptor.com')).toBe(true);
    expect(isDisposableEmail('user@skymail.ink')).toBe(true);
    expect(isDisposableEmail('user@tutamail.com')).toBe(true);
    expect(isDisposableEmail('user@kksk.uk')).toBe(true);
    expect(isDisposableEmail('user@gtempaccount.com')).toBe(true);
    expect(isDisposableEmail('user@privaterelay.appleid.com')).toBe(true);
  });

  it('should return false for non-disposable email domains', () => {
    expect(isDisposableEmail('user@gmail.com')).toBe(false);
    expect(isDisposableEmail('user@novu.co')).toBe(false);
  });
});

describe('isBusinessEmail', () => {
  it('should return true for business email domains', () => {
    expect(isBusinessEmail('user@novu.co')).toBe(true);
    expect(isBusinessEmail('user@company.com')).toBe(true);
    expect(isBusinessEmail('user@acme.io')).toBe(true);
  });

  it('should return false for free email providers', () => {
    expect(isBusinessEmail('user@gmail.com')).toBe(false);
    expect(isBusinessEmail('user@yahoo.com')).toBe(false);
  });

  it('should return false for disposable email providers', () => {
    expect(isBusinessEmail('user@minitts.net')).toBe(false);
    expect(isBusinessEmail('user@skymail.ink')).toBe(false);
  });

  it('should return false for .edu. university domains', () => {
    expect(isBusinessEmail('student@cs.edu.au')).toBe(false);
    expect(isBusinessEmail('student@mail.edu.cn')).toBe(false);
  });
});
