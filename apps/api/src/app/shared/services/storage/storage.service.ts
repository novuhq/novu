import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { URL } from 'url';
import { Storage } from '@google-cloud/storage';

export interface IFilePath {
  path: string;
  name: string;
}

export abstract class StorageService {
  abstract getSignedUrl(key: string, contentType: string): Promise<{ signedUrl: string; path: string }>;
}

export class S3StorageService implements StorageService {
  private s3 = new S3Client({
    region: process.env.S3_REGION,
    endpoint: process.env.S3_LOCAL_STACK || undefined,
    forcePathStyle: true,
  });

  async getSignedUrl(key: string, contentType: string) {
    const command = new PutObjectCommand({
      Key: key,
      Bucket: process.env.S3_BUCKET_NAME,
      ACL: 'public-read',
      ContentType: contentType,
    });

    const signedUrl = await getSignedUrl(this.s3, command, { expiresIn: 3600 });
    const parsedUrl = new URL(signedUrl);

    return {
      signedUrl,
      path: `${parsedUrl.origin}${parsedUrl.pathname}`,
    };
  }
}

export class GCSStorageService implements StorageService {
  private gcs = new Storage();

  async getSignedUrl(key: string, contentType: string) {
    const [signedUrl] = await this.gcs
      .bucket(process.env.GCS_BUCKET_NAME)
      .file(key)
      .getSignedUrl({
        version: 'v4',
        action: 'write',
        expires: Date.now() + 60 * 60 * 1000, // 60 minutes
        contentType,
      });

    const parsedUrl = new URL(signedUrl);

    return {
      signedUrl,
      path: `${process.env.GCS_DOMAIN}${parsedUrl.pathname}`,
    };
  }
}
