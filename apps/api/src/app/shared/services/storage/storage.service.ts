import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { URL } from 'url';

export interface IFilePath {
  path: string;
  name: string;
}

export class StorageService {
  private s3 = new S3Client({
    region: process.env.S3_REGION,
    endpoint: process.env.S3_LOCAL_STACK || undefined,
    forcePathStyle: true,
  });

  async getSignedUrl(key: string, contentType?: string) {
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
