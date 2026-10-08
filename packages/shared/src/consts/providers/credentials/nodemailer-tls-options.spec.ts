import { describe, expect, it } from 'vitest';
import { CredentialsKeyEnum } from '../../../types';
import { nodemailerConfig } from './provider-credentials';

describe('nodemailer TLS options', () => {
  const tlsOptions = nodemailerConfig.find((credential) => credential.key === CredentialsKeyEnum.TlsOptions);

  it('accepts a JSON object in the integration form', () => {
    expect(tlsOptions?.type).toBe('textarea');

    const validate = tlsOptions?.validation?.validate;

    expect(validate?.('{"minVersion":"TLSv1.2"}')).toBe(true);
    expect(validate?.('{\n  "ca": "-----BEGIN CERTIFICATE-----\\nMII\\n-----END CERTIFICATE-----\\n"\n}')).toBe(true);
    expect(validate?.({ minVersion: 'TLSv1.2' } as unknown as string)).toBe(true);
    expect(validate?.('')).toBe(true);
  });

  it('rejects JSON that is not an object', () => {
    const validate = tlsOptions?.validation?.validate;

    expect(validate?.('[]')).toBe('TLS options must be a JSON object.');
    expect(validate?.('"TLSv1.2"')).toBe('TLS options must be a JSON object.');
    expect(validate?.('{')).toBe('TLS options must be a JSON object.');
  });
});
