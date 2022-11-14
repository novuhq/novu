import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  S3Client,
  PutObjectCommand,
  PutObjectCommandOutput,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { URL } from 'url';
import { Readable } from 'stream';
import { Storage } from '@google-cloud/storage';
import {
  StorageSharedKeyCredential,
  BlobSASPermissions,
  BlobServiceClient,
  generateBlobSASQueryParameters,
  SASProtocol,
} from '@azure/storage-blob';
import { NonExistingFileError } from '../../errors/non-existing-file.error';

export interface IFilePath {
  path: string;
  name: string;
}

export abstract class StorageService {
  abstract getSignedUrl(
    key: string,
    contentType: string
  ): Promise<{ signedUrl: string; path: string; additionalHeaders?: Record<string, string> }>;
  abstract uploadFile(key: string, file: Buffer, contentType: string): Promise<PutObjectCommandOutput>;
  abstract getFile(key: string): Promise<Buffer>;
  abstract deleteFile(key: string): Promise<void>;
}

async function streamToString(stream: Readable): Promise<string> {
  return await new Promise((resolve, reject) => {
    const chunks: Uint8Array[] = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('base64')));
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
      const bodyContents = await streamToString(data.Body as Readable);

      return bodyContents as unknown as Buffer;
    } catch (error) {
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

    return {
      signedUrl,
      path: `${parsedUrl.origin}${parsedUrl.pathname}`,
    };
  }
}

export class GCSStorageService implements StorageService {
  private gcs = new Storage();

  async uploadFile(key: string, file: Buffer, contentType: string): Promise<PutObjectCommandOutput> {
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
    try {
      const bucket = this.gcs.bucket(process.env.GCS_BUCKET_NAME);
      const fileObject = bucket.file(key);
      const [file] = await fileObject.download();

      return file;
    } catch (error) {
      if (error.code === 404) {
        throw new NonExistingFileError();
      }
      throw error;
    }
  }

  async deleteFile(key: string): Promise<void> {
    const bucket = this.gcs.bucket(process.env.GCS_BUCKET_NAME);
    const fileObject = bucket.file(key);
    fileObject.delete();
  }

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

export class AzureBlobStorageService implements StorageService {
  private sharedKeyCredential = new StorageSharedKeyCredential(
    process.env.AZURE_ACCOUNT_NAME,
    process.env.AZURE_ACCOUNT_KEY
  );
  private blobServiceClient = new BlobServiceClient(
    process.env.AZURE_HOST_NAME || `https://${process.env.AZURE_ACCOUNT_NAME}.blob.core.windows.net`,
    this.sharedKeyCredential
  );

  async uploadFile(key: string, file: Buffer, contentType: string): Promise<PutObjectCommandOutput> {
    const containerClient = this.blobServiceClient.getContainerClient(process.env.AZURE_CONTAINER_NAME);
    const blockBlobClient = containerClient.getBlockBlobClient(key);

    return (await blockBlobClient.upload(file, file.length, {
      blobHTTPHeaders: {
        blobContentType: contentType,
      },
    })) as unknown as PutObjectCommandOutput;
  }

  async getFile(key: string): Promise<Buffer> {
    const containerClient = this.blobServiceClient.getContainerClient(process.env.AZURE_CONTAINER_NAME);
    const blockBlobClient = containerClient.getBlockBlobClient(key);

    try {
      return await blockBlobClient.downloadToBuffer();
    } catch (error) {
      if (error.statusCode === 404) {
        throw new NonExistingFileError();
      }
      throw error;
    }
  }

  async deleteFile(key: string): Promise<void> {
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
