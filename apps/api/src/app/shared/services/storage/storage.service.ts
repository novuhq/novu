import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { URL } from 'url';
import { Storage } from '@google-cloud/storage';
import {
  StorageSharedKeyCredential,
  BlobSASPermissions,
  BlobServiceClient,
  generateBlobSASQueryParameters,
  SASProtocol,
} from '@azure/storage-blob';

export interface IFilePath {
  path: string;
  name: string;
}

export abstract class StorageService {
  abstract getSignedUrl(
    key: string,
    contentType: string
  ): Promise<{ signedUrl: string; path: string; additionalHeaders?: Record<string, string> }>;
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
      additionalHeaders: {},
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
      additionalHeaders: {},
    };
  }
}

export class AzureBlobStorageService implements StorageService {
  private sharedKeyCredential = new StorageSharedKeyCredential(
    process.env.AZURE_ACCOUNT_NAME,
    process.env.AZURE_ACCOUNT_KEY
  );
  private blobServiceClient = new BlobServiceClient(
    process.env.AZURE_HOST_NAME || `https://${process.env.AZURE_ACCOUNT_NAME}.blob.core.windows.net`,
    this.sharedKeyCredential
  );

  async getSignedUrl(key: string, contentType: string) {
    const containerName = process.env.AZURE_CONTAINER_NAME || 'novu';
    const blobName = key;
    const containerClient = this.blobServiceClient.getContainerClient(containerName);
    const blobClient = containerClient.getBlobClient(blobName);
    const blobSAS = generateBlobSASQueryParameters(
      {
        containerName,
        blobName,
        permissions: BlobSASPermissions.parse('racwd'),
        startsOn: new Date(),
        expiresOn: new Date(new Date().valueOf() + 60 * 60 * 1000), // 60 minutes
        protocol: SASProtocol.HttpsAndHttp,
        contentType: contentType,
      },
      this.sharedKeyCredential
    ).toString();

    const signedUrl = `${blobClient.url}?${blobSAS}`;
    const additionalHeaders = {
      'x-ms-blob-type': 'BlockBlob',
    };

    return {
      signedUrl,
      path: `${blobClient.url}`,
      additionalHeaders: additionalHeaders,
    };
  }
}
