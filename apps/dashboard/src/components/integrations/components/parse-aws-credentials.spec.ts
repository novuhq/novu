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
    const env = `# AWS_ACCESS_KEY_ID=AKIAOLDOLDOLDOLDOLD1\nAWS_ACCESS_KEY_ID=${ID}\nAWS_REGION=somewhere`;

    expect(parseAwsCredentials(env)).toEqual({ [CredentialsKeyEnum.ApiKey]: ID });
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
