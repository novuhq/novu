import { CredentialsKeyEnum } from '@novu/shared';
import { describe, expect, it } from 'vitest';
import {
  hasTemporaryAwsKey,
  isAwsAccessKeyId,
  isLikelyAwsCredentialsBlock,
  parseAwsCredentials,
} from './parse-aws-credentials';

// AWS's documentation examples, not real credentials.
const ID = 'AKIAIOSFODNN7EXAMPLE';
const SECRET = 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY';
// Stand-ins for other services' keys, built here so no secret-shaped literal sits in the repository.
const OTHER_ID = `AKIA${'B'.repeat(16)}`;
const OTHER_SECRET = 'x'.repeat(40);
const BOTH = { [CredentialsKeyEnum.ApiKey]: ID, [CredentialsKeyEnum.SecretKey]: SECRET };

describe('isLikelyAwsCredentialsBlock', () => {
  it('leaves a bare key to the field it was pasted into', () => {
    expect(isLikelyAwsCredentialsBlock(ID)).toBe(false);
    expect(isLikelyAwsCredentialsBlock(`  ${ID}\n`)).toBe(false);
    expect(isLikelyAwsCredentialsBlock(SECRET)).toBe(false);
  });

  it('recognises a key in a CSV row, an assignment or a multi-line block', () => {
    expect(isLikelyAwsCredentialsBlock(`${ID},${SECRET}`)).toBe(true);
    expect(isLikelyAwsCredentialsBlock(`AWS_ACCESS_KEY_ID=${ID}`)).toBe(true);
    expect(isLikelyAwsCredentialsBlock(`${ID}\n${SECRET}`)).toBe(true);
  });
});

describe('parseAwsCredentials', () => {
  it('reads the access key file AWS downloads', () => {
    expect(parseAwsCredentials(`Access key ID,Secret access key\r\n${ID},${SECRET}\r\n`)).toEqual(BOTH);
  });

  it('reads a key file with a byte order mark and extra columns', () => {
    const csv = `﻿User name,Password,Access key ID,Secret access key,Console login link\nnovu,,${ID},${SECRET},https://example.com`;

    expect(parseAwsCredentials(csv)).toEqual(BOTH);
  });

  it('reads environment variables, with the region', () => {
    const env = `export AWS_ACCESS_KEY_ID="${ID}"\nexport AWS_SECRET_ACCESS_KEY='${SECRET}'\nAWS_REGION=eu-west-1`;

    expect(parseAwsCredentials(env)).toEqual({ ...BOTH, [CredentialsKeyEnum.Region]: 'eu-west-1' });
  });

  it('reads a credentials file', () => {
    const file = `[default]\naws_access_key_id = ${ID}\naws_secret_access_key = ${SECRET}\nregion = us-east-2`;

    expect(parseAwsCredentials(file)).toEqual({ ...BOTH, [CredentialsKeyEnum.Region]: 'us-east-2' });
  });

  it('finds unlabelled values by their shape', () => {
    expect(parseAwsCredentials(`${ID}\n${SECRET}`)).toEqual(BOTH);
  });

  it('skips commented-out lines and values that are not a region', () => {
    const env = `# AWS_ACCESS_KEY_ID=${OTHER_ID}\nAWS_ACCESS_KEY_ID=${ID}\nAWS_REGION=somewhere`;

    expect(parseAwsCredentials(env)).toEqual({ [CredentialsKeyEnum.ApiKey]: ID });
  });

  it('prefers the AWS variables over other services’ keys in a full .env', () => {
    const env = [
      `APP_SECRET_KEY=${OTHER_SECRET}`,
      `BACKUP_SECRET_ACCESS_KEY=${OTHER_SECRET}`,
      `BACKUP_ACCESS_KEY_ID=${OTHER_ID}`,
      `AWS_ACCESS_KEY_ID=${ID}`,
      `AWS_SECRET_ACCESS_KEY=${SECRET}`,
    ].join('\n');

    expect(parseAwsCredentials(env)).toEqual(BOTH);
  });

  it('does not guess a secret from another variable when the AWS one is missing', () => {
    const env = `APP_SECRET_KEY=${OTHER_SECRET}\nAWS_ACCESS_KEY_ID=${ID}`;

    expect(parseAwsCredentials(env)).toEqual({ [CredentialsKeyEnum.ApiKey]: ID });
  });

  it('reads one profile of a credentials file, not a mix', () => {
    const file = [
      '[default]',
      'region = us-east-1',
      '[profile novu]',
      `aws_access_key_id = ${ID}`,
      `aws_secret_access_key = ${SECRET}`,
      'region = eu-west-1',
      '[profile other]',
      `aws_access_key_id = ${OTHER_ID}`,
      'region = ap-south-1',
    ].join('\n');

    expect(parseAwsCredentials(file)).toEqual({ ...BOTH, [CredentialsKeyEnum.Region]: 'eu-west-1' });
  });

  it('leaves the region out when only another profile names one', () => {
    const file = `[default]\nregion = us-east-1\n[novu]\naws_access_key_id = ${ID}\naws_secret_access_key = ${SECRET}`;

    expect(parseAwsCredentials(file)).toEqual(BOTH);
  });

  it('returns nothing for unrelated text', () => {
    expect(parseAwsCredentials('hello world')).toEqual({});
  });
});

describe('key ID checks', () => {
  it('accepts long-term keys only', () => {
    expect(isAwsAccessKeyId(ID)).toBe(true);
    expect(isAwsAccessKeyId('ASIAIOSFODNN7EXAMPLE')).toBe(false);
    expect(isAwsAccessKeyId('nope')).toBe(false);
  });

  it('spots temporary keys', () => {
    expect(hasTemporaryAwsKey(`AWS_ACCESS_KEY_ID=ASIAIOSFODNN7EXAMPLE`)).toBe(true);
    expect(hasTemporaryAwsKey(`AWS_ACCESS_KEY_ID=${ID}`)).toBe(false);
  });
});
