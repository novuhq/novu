import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  BlobSASPermissions,
  BlobServiceClient,
  generateBlobSASQueryParameters,
  SASProtocol,
  StorageSharedKeyCredential,
} from '@azure/storage-blob';
import { Storage } from '@google-cloud/storage';
import { Readable } from 'stream';
import { URL } from 'url';

import { NonExistingFileError } from './non-existing-file.error';

export interface IFilePath {
  path: string;
  name: string;
}

export abstract class StorageService {
  abstract getSignedUrl(
    key: string,
    contentType: string
  ): Promise<{
    signedUrl: string;
    path: string;
    additionalHeaders?: Record<string, string>;
  }>;
  abstract getReadSignedUrl(key: string, ttlSeconds: number): Promise<string>;
  abstract fileExists(key: string): Promise<boolean>;
  abstract uploadFile(key: string, file: Buffer, contentType: string): Promise<void>;
  abstract getFile(key: string): Promise<Buffer>;
  abstract deleteFile(key: string): Promise<void>;
}

function isAzureBlobNotFound(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const azureError = error as { code?: string; details?: { errorCode?: string } };

  return azureError.code === 'BlobNotFound' || azureError.details?.errorCode === 'BlobNotFound';
}

function isS3ObjectNotFound(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const s3Error = error as { code?: string; message?: string };

  return s3Error.code === 'NoSuchKey' || s3Error.message === 'The specified key does not exist.';
}

function isS3HeadNotFound(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const s3Error = error as { name?: string; Code?: string; $metadata?: { httpStatusCode?: number } };

  return (
    s3Error.name === 'NotFound' ||
    s3Error.Code === 'NotFound' ||
    s3Error.Code === 'NoSuchKey' ||
    s3Error.$metadata?.httpStatusCode === 404
  );
}

function isGcsObjectNotFound(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const gcsError = error as {
    code?: number | string;
    message?: string;
    errors?: Array<{ message?: string }>;
  };

  if (gcsError.code !== 404 && gcsError.code !== '404') {
    return false;
  }

  const message = [gcsError.message, ...(gcsError.errors ?? []).map((entry) => entry.message)]
    .filter(Boolean)
    .join(' ');

  return !/specified bucket does not exist/i.test(message);
}

function azureSasStartsOn(): Date {
  return new Date(Date.now() - 5 * 60 * 1000);
}

async function streamToBuffer(stream: Readable): Promise<Buffer> {
  return await new Promise((resolve, reject) => {
    const chunks: Uint8Array[] = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks)));
  });
}
export class S3StorageService implements StorageService {
  private s3 = new S3Client({
    region: process.env.S3_REGION,
    endpoint: process.env.S3_LOCAL_STACK || undefined,
    forcePathStyle: true,
  });

  async uploadFile(key: string, file: Buffer, contentType: string): Promise<void> {
    const command = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: key,
      Body: file,
      ContentType: contentType,
    });

    await this.s3.send(command);
  }

  async getFile(key: string): Promise<Buffer> {
    try {
      const command = new GetObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: key,
      });
      const data = await this.s3.send(command);

      return await streamToBuffer(data.Body as Readable);
    } catch (error: unknown) {
      if (isS3ObjectNotFound(error)) {
        throw new NonExistingFileError();
      }

      throw error;
    }
  }

  async deleteFile(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: key,
    });
    await this.s3.send(command);
  }

  async getSignedUrl(key: string, contentType: string) {
    const command = new PutObjectCommand({
      Key: key,
      Bucket: process.env.S3_BUCKET_NAME,
      ACL: 'public-read',
      ContentType: contentType,
    });

    const signedUrl = await getSignedUrl(this.s3, command, { expiresIn: 3600 });
    const parsedUrl = new URL(signedUrl);
    const path = process.env.CDN_URL ? `${process.env.CDN_URL}/${key}` : `${parsedUrl.origin}${parsedUrl.pathname}`;

    return { signedUrl, path };
  }

  async getReadSignedUrl(key: string, ttlSeconds: number): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: key,
    });

    return await getSignedUrl(this.s3, command, { expiresIn: ttlSeconds });
  }

  async fileExists(key: string): Promise<boolean> {
    try {
      await this.s3.send(
        new HeadObjectCommand({
          Bucket: process.env.S3_BUCKET_NAME,
          Key: key,
        })
      );

      return true;
    } catch (error: unknown) {
      if (isS3HeadNotFound(error)) {
        return false;
      }

      throw error;
    }
  }
}

export class GCSStorageService implements StorageService {
  private gcs = new Storage();

  private requireBucketName(): string {
    if (!process.env.GCS_BUCKET_NAME) {
      throw new Error('GCS_BUCKET_NAME is not defined as env variable');
    }

    return process.env.GCS_BUCKET_NAME;
  }

  async uploadFile(key: string, file: Buffer, contentType: string): Promise<void> {
    const fileObject = this.gcs.bucket(this.requireBucketName()).file(key);

    await fileObject.save(file, {
      contentType,
      resumable: false,
    });
  }

  async getFile(key: string): Promise<Buffer> {
    try {
      const fileObject = this.gcs.bucket(this.requireBucketName()).file(key);
      const [file] = await fileObject.download();

      return file;
    } catch (error: unknown) {
      if (isGcsObjectNotFound(error)) {
        throw new NonExistingFileError();
      }

      throw error;
    }
  }

  async deleteFile(key: string): Promise<void> {
    const fileObject = this.gcs.bucket(this.requireBucketName()).file(key);
    await fileObject.delete({ ignoreNotFound: true });
  }

  async getSignedUrl(key: string, contentType: string) {
    const [signedUrl] = await this.gcs
      .bucket(this.requireBucketName())
      .file(key)
      .getSignedUrl({
        version: 'v4',
        action: 'write',
        expires: Date.now() + 60 * 60 * 1000, // 60 minutes
        contentType,
      });

    const parsedUrl = new URL(signedUrl);
    let path: string;
    if (process.env.CDN_URL) {
      path = `${process.env.CDN_URL}/${key}`;
    } else if (process.env.GCS_DOMAIN) {
      path = `${process.env.GCS_DOMAIN}${parsedUrl.pathname}`;
    } else {
      throw new Error('GCS_DOMAIN or CDN_URL is required for public branding and profile upload paths');
    }

    return { signedUrl, path };
  }

  async getReadSignedUrl(key: string, ttlSeconds: number): Promise<string> {
    const [signedUrl] = await this.gcs
      .bucket(this.requireBucketName())
      .file(key)
      .getSignedUrl({
        version: 'v4',
        action: 'read',
        expires: Date.now() + ttlSeconds * 1000,
      });

    return signedUrl;
  }

  async fileExists(key: string): Promise<boolean> {
    const [exists] = await this.gcs.bucket(this.requireBucketName()).file(key).exists();

    return exists;
  }
}

export class AzureBlobStorageService implements StorageService {
  private sharedKeyCredential = new StorageSharedKeyCredential(
    process.env.AZURE_ACCOUNT_NAME as string,
    process.env.AZURE_ACCOUNT_KEY as string
  );
  private blobServiceClient = new BlobServiceClient(
    process.env.AZURE_HOST_NAME || `https://${process.env.AZURE_ACCOUNT_NAME}.blob.core.windows.net`,
    this.sharedKeyCredential
  );

  async uploadFile(key: string, file: Buffer, contentType: string): Promise<void> {
    if (!process.env.AZURE_CONTAINER_NAME) throw new Error('AZURE_CONTAINER_NAME is not defined as env variable');

    const containerClient = this.blobServiceClient.getContainerClient(process.env.AZURE_CONTAINER_NAME);
    const blockBlobClient = containerClient.getBlockBlobClient(key);

    await blockBlobClient.upload(file, file.length, {
      blobHTTPHeaders: {
        blobContentType: contentType,
      },
    });
  }

  async getFile(key: string): Promise<Buffer> {
    if (!process.env.AZURE_CONTAINER_NAME) throw new Error('AZURE_CONTAINER_NAME is not defined as env variable');

    const containerClient = this.blobServiceClient.getContainerClient(process.env.AZURE_CONTAINER_NAME);
    const blockBlobClient = containerClient.getBlockBlobClient(key);

    try {
      return await blockBlobClient.downloadToBuffer();
    } catch (error: unknown) {
      if (isAzureBlobNotFound(error)) {
        throw new NonExistingFileError();
      }
      throw error;
    }
  }

  async deleteFile(key: string): Promise<void> {
    if (!process.env.AZURE_CONTAINER_NAME) throw new Error('AZURE_CONTAINER_NAME is not defined as env variable');

    const containerClient = this.blobServiceClient.getContainerClient(process.env.AZURE_CONTAINER_NAME);
    const blockBlobClient = containerClient.getBlockBlobClient(key);
    await blockBlobClient.deleteIfExists();
  }

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
        startsOn: azureSasStartsOn(),
        expiresOn: new Date(Date.now() + 60 * 60 * 1000), // 60 minutes
        protocol: SASProtocol.HttpsAndHttp,
        contentType,
      },
      this.sharedKeyCredential
    ).toString();

    const signedUrl = `${blobClient.url}?${blobSAS}`;
    const path = process.env.CDN_URL ? `${process.env.CDN_URL}/${key}` : `${blobClient.url}`;
    const additionalHeaders = {
      'x-ms-blob-type': 'BlockBlob',
    };

    return {
      signedUrl,
      path,
      additionalHeaders,
    };
  }

  async getReadSignedUrl(key: string, ttlSeconds: number): Promise<string> {
    const containerName = process.env.AZURE_CONTAINER_NAME || 'novu';
    const blobName = key;
    const containerClient = this.blobServiceClient.getContainerClient(containerName);
    const blobClient = containerClient.getBlobClient(blobName);
    const blobSAS = generateBlobSASQueryParameters(
      {
        containerName,
        blobName,
        permissions: BlobSASPermissions.parse('r'),
        startsOn: azureSasStartsOn(),
        expiresOn: new Date(Date.now() + ttlSeconds * 1000),
        protocol: SASProtocol.Https,
      },
      this.sharedKeyCredential
    ).toString();

    return `${blobClient.url}?${blobSAS}`;
  }

  async fileExists(key: string): Promise<boolean> {
    if (!process.env.AZURE_CONTAINER_NAME) throw new Error('AZURE_CONTAINER_NAME is not defined as env variable');

    const containerClient = this.blobServiceClient.getContainerClient(process.env.AZURE_CONTAINER_NAME);
    const blockBlobClient = containerClient.getBlockBlobClient(key);

    return await blockBlobClient.exists();
  }
}
