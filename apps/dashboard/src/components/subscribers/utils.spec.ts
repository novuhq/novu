import type { ISubscriberResponseDto } from '@novu/shared';
import { describe, expect, it } from 'vitest';
import { getSubscriberFullName, getSubscriberTitle } from './utils';

const subscriber = (fields: Partial<ISubscriberResponseDto>): ISubscriberResponseDto => ({
  subscriberId: 'sub_8f21',
  _organizationId: 'org',
  _environmentId: 'env',
  deleted: false,
  createdAt: '2026-11-24T00:00:00.000Z',
  updatedAt: '2026-11-24T00:00:00.000Z',
  ...fields,
});

describe('getSubscriberFullName', () => {
  it('joins the first and last name, trimming only the ends', () => {
    expect(getSubscriberFullName({ firstName: 'Jane', lastName: 'Alvarez' })).toBe('Jane Alvarez');
    expect(getSubscriberFullName({ firstName: ' Jane', lastName: 'Alvarez ' })).toBe('Jane Alvarez');
    expect(getSubscriberFullName({ firstName: 'Jane', lastName: null })).toBe('Jane');
    expect(getSubscriberFullName({ lastName: 'Alvarez' })).toBe('Alvarez');
  });

  it('is empty without a name', () => {
    expect(getSubscriberFullName({})).toBe('');
    expect(getSubscriberFullName({ firstName: '', lastName: '  ' })).toBe('');
  });
});

describe('getSubscriberTitle', () => {
  it('is the full name when the subscriber has one', () => {
    expect(getSubscriberTitle(subscriber({ firstName: 'Jane', lastName: 'Alvarez', email: 'jane@acme.com' }))).toBe(
      'Jane Alvarez'
    );
  });

  it('falls back to the email, then the phone, then the subscriberId', () => {
    expect(getSubscriberTitle(subscriber({ firstName: ' ', email: 'jane@acme.com', phone: '+15550100' }))).toBe(
      'jane@acme.com'
    );
    expect(getSubscriberTitle(subscriber({ phone: '+15550100' }))).toBe('+15550100');
    expect(getSubscriberTitle(subscriber({}))).toBe('sub_8f21');
  });
});
