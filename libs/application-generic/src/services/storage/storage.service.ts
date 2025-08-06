import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  PutObjectCommandOutput,
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
  abstract uploadFile(key: string, file: Buffer, contentType: string): Promise<PutObjectCommandOutput>;
  abstract getFile(key: string): Promise<Buffer>;
  abstract deleteFile(key: string): Promise<void>;
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

  async uploadFile(key: string, file: Buffer, contentType: string): Promise<PutObjectCommandOutput> {
    const command = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: key,
      Body: file,
      ContentType: contentType,
    });

    return await this.s3.send(command);
  }

  async getFile(key: string): Promise<Buffer> {
    try {
      const command = new GetObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: key,
      });
      const data = await this.s3.send(command);
      const bodyContents = await streamToBuffer(data.Body as Readable);

      return bodyContents as unknown as Buffer;
    } catch (error: any) {
      if (error.code === 'NoSuchKey' || error.message === 'The specified key does not exist.') {
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
}

export class GCSStorageService implements StorageService {
  private gcs = new Storage();

  async uploadFile(key: string, file: Buffer, contentType: string): Promise<PutObjectCommandOutput> {
    if (!process.env.GCS_BUCKET_NAME) throw new Error('GCS_BUCKET_NAME is not defined as env variable');

    const bucket = this.gcs.bucket(process.env.GCS_BUCKET_NAME);
    const fileObject = bucket.file(key);

    return (await fileObject.save(file, {
      contentType,
      metadata: {
        cacheControl: 'public, max-age=31536000',
      },
    })) as unknown as PutObjectCommandOutput;
  }

  async getFile(key: string): Promise<Buffer> {
    if (!process.env.GCS_BUCKET_NAME) throw new Error('GCS_BUCKET_NAME is not defined as env variable');

    try {
      const bucket = this.gcs.bucket(process.env.GCS_BUCKET_NAME);
      const fileObject = bucket.file(key);
      const [file] = await fileObject.download();

      return file;
    } catch (error: any) {
      if (error.code === 404) {
        throw new NonExistingFileError();
      }
      throw error;
    }
  }

  async deleteFile(key: string): Promise<void> {
    if (!process.env.GCS_BUCKET_NAME) throw new Error('GCS_BUCKET_NAME is not defined as env variable');

    const bucket = this.gcs.bucket(process.env.GCS_BUCKET_NAME);
    const fileObject = bucket.file(key);
    fileObject.delete();
  }

  async getSignedUrl(key: string, contentType: string) {
    if (!process.env.GCS_BUCKET_NAME) throw new Error('GCS_BUCKET_NAME is not defined as env variable');

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
    const path = process.env.CDN_URL
      ? `${process.env.CDN_URL}/${key}`
      : `${process.env.GCS_DOMAIN}${parsedUrl.pathname}`;

    return { signedUrl, path };
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

  async uploadFile(key: string, file: Buffer, contentType: string): Promise<PutObjectCommandOutput> {
    if (!process.env.AZURE_CONTAINER_NAME) throw new Error('AZURE_CONTAINER_NAME is not defined as env variable');

    const containerClient = this.blobServiceClient.getContainerClient(process.env.AZURE_CONTAINER_NAME);
    const blockBlobClient = containerClient.getBlockBlobClient(key);

    return (await blockBlobClient.upload(file, file.length, {
      blobHTTPHeaders: {
        blobContentType: contentType,
      },
    })) as unknown as PutObjectCommandOutput;
  }

  async getFile(key: string): Promise<Buffer> {
    if (!process.env.AZURE_CONTAINER_NAME) throw new Error('AZURE_CONTAINER_NAME is not defined as env variable');

    const containerClient = this.blobServiceClient.getContainerClient(process.env.AZURE_CONTAINER_NAME);
    const blockBlobClient = containerClient.getBlockBlobClient(key);

    try {
      return await blockBlobClient.downloadToBuffer();
    } catch (error: any) {
      if (error.statusCode === 404) {
        throw new NonExistingFileError();
      }
      throw error;
    }
  }

  async deleteFile(key: string): Promise<void> {
    if (!process.env.AZURE_CONTAINER_NAME) throw new Error('AZURE_CONTAINER_NAME is not defined as env variable');

    const containerClient = this.blobServiceClient.getContainerClient(process.env.AZURE_CONTAINER_NAME);
    const blockBlobClient = containerClient.getBlockBlobClient(key);
    blockBlobClient.delete();
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
        startsOn: new Date(),
        expiresOn: new Date(new Date().valueOf() + 60 * 60 * 1000), // 60 minutes
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
}
