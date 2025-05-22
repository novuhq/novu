import { Injectable } from '@nestjs/common';
import { StorageService } from '@novu/application-generic';
import { PutObjectCommandOutput } from '@aws-sdk/client-s3';

@Injectable()
export class MockStorageService implements StorageService {
  private storage: Map<string, Buffer> = new Map();

  async getSignedUrl(key: string, contentType: string) {
    return {
      signedUrl: `https://mock-storage/${key}`,
      path: `https://mock-storage/${key}`,
    };
  }

  async uploadFile(
    key: string,
    file: Buffer,
    contentType: string,
  ): Promise<PutObjectCommandOutput> {
    this.storage.set(key, file);
    return {} as PutObjectCommandOutput;
  }

  async getFile(key: string): Promise<Buffer> {
    const file = this.storage.get(key);
    if (!file) {
      const error: any = new Error('The specified key does not exist.');
      error.code = 'NoSuchKey';
      throw error;
    }
    return file;
  }

  async deleteFile(key: string): Promise<void> {
    this.storage.delete(key);
  }
}
