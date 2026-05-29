import '../../src/config';

import { NestFactory } from '@nestjs/core';
import { ApiKeyCredential, ServiceAccount, SigningSecret } from '@novu/dal';

import { AppModule } from '../../src/app.module';

export async function createApiKeysV2Indexes() {
  const app = await NestFactory.create(AppModule, {
    logger: false,
  });

  try {
    await ServiceAccount.syncIndexes();
    await ApiKeyCredential.syncIndexes();
    await SigningSecret.syncIndexes();

    console.log('API Keys v2 indexes synced successfully');
  } finally {
    await app.close();
  }
}

createApiKeysV2Indexes().catch((error) => {
  console.error(error);
  process.exit(1);
});
