import type { SendMailOptions } from 'nodemailer';

/**
 * Mitigates DoS in vulnerable nodemailer addressparser (recursive parse on nested `:` groups).
 * @see https://github.com/nodemailer/nodemailer/issues/578
 */
const MAX_COLONS_PER_ADDRESS_HEADER = 100;

const HEADER_KEYS_TO_CHECK = new Set(['to', 'cc', 'bcc', 'from', 'reply-to', 'sender', 'delivered-to']);

function countColons(value: string): number {
  let n = 0;

  for (let i = 0; i < value.length; i++) {
    if (value.charCodeAt(i) === 58) {
      n++;
    }
  }

  return n;
}

export function assertSafeNodemailerAddressHeader(value: string): void {
  if (countColons(value) > MAX_COLONS_PER_ADDRESS_HEADER) {
    throw new Error(
      'Email address header rejected: exceeds safe complexity for parsing (nodemailer address-parser mitigation)'
    );
  }
}

export function assertSafeNodemailerAddressHeaders(values: string[] | undefined): void {
  if (!values?.length) {
    return;
  }

  for (const v of values) {
    assertSafeNodemailerAddressHeader(v);
  }
}

interface AddressLike {
  name?: string;
  address?: string;
}

function checkAddressOrStringField(value: string | AddressLike | Array<string | AddressLike> | undefined): void {
  if (value === undefined) {
    return;
  }

  if (typeof value === 'string') {
    assertSafeNodemailerAddressHeader(value);

    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      if (typeof item === 'string') {
        assertSafeNodemailerAddressHeader(item);
      } else if (item && typeof item === 'object') {
        if (item.name) {
          assertSafeNodemailerAddressHeader(item.name);
        }

        if (item.address) {
          assertSafeNodemailerAddressHeader(item.address);
        }
      }
    }

    return;
  }

  if (value.name) {
    assertSafeNodemailerAddressHeader(value.name);
  }

  if (value.address) {
    assertSafeNodemailerAddressHeader(value.address);
  }
}

function checkEnvelope(envelope: SendMailOptions['envelope']): void {
  if (!envelope || typeof envelope !== 'object') {
    return;
  }

  const e = envelope as Record<string, unknown>;

  for (const key of ['from', 'to', 'cc', 'bcc']) {
    const v = e[key];
    if (typeof v === 'string') {
      assertSafeNodemailerAddressHeader(v);

      continue;
    }

    if (key !== 'from' && Array.isArray(v)) {
      for (const item of v) {
        if (typeof item === 'string') {
          assertSafeNodemailerAddressHeader(item);
        }
      }
    }
  }
}

function checkHeaders(headers: SendMailOptions['headers']): void {
  if (!headers) {
    return;
  }

  if (Array.isArray(headers)) {
    for (const row of headers) {
      if (!row || typeof row !== 'object') {
        continue;
      }

      const key = (row as { key?: string }).key;
      const value = (row as { value?: string }).value;
      if (key && typeof value === 'string' && HEADER_KEYS_TO_CHECK.has(key.toLowerCase())) {
        assertSafeNodemailerAddressHeader(value);
      }
    }

    return;
  }

  for (const [key, val] of Object.entries(headers)) {
    if (!HEADER_KEYS_TO_CHECK.has(key.toLowerCase())) {
      continue;
    }

    if (typeof val === 'string') {
      assertSafeNodemailerAddressHeader(val);
    } else if (Array.isArray(val)) {
      for (const item of val) {
        if (typeof item === 'string') {
          assertSafeNodemailerAddressHeader(item);
        }
      }
    } else if (val && typeof val === 'object' && 'value' in val) {
      const v = (val as { value: string }).value;
      if (typeof v === 'string') {
        assertSafeNodemailerAddressHeader(v);
      }
    }
  }
}

function checkReferences(refs: SendMailOptions['references']): void {
  if (!refs) {
    return;
  }

  if (typeof refs === 'string') {
    assertSafeNodemailerAddressHeader(refs);

    return;
  }

  for (const r of refs) {
    assertSafeNodemailerAddressHeader(r);
  }
}

/**
 * Validates address-bearing fields before nodemailer parses them (sendMail / MailComposer).
 */
export function assertSafeSendMailOptionsForNodemailerDos(mail: SendMailOptions): void {
  checkAddressOrStringField(mail.from);
  checkAddressOrStringField(mail.sender);
  checkAddressOrStringField(mail.to);
  checkAddressOrStringField(mail.cc);
  checkAddressOrStringField(mail.bcc);
  checkAddressOrStringField(mail.replyTo);
  checkAddressOrStringField(mail.inReplyTo);
  checkReferences(mail.references);
  checkEnvelope(mail.envelope);
  checkHeaders(mail.headers);
}
