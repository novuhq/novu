import { Module, Provider } from '@nestjs/common';
import { Svix } from 'svix'; // Import Svix SDK
import { SharedModule } from '../shared/shared.module';
import { WebhooksController } from './webhooks.controller';
import { GetWebhookPortalTokenUsecase } from './usecases/get-webhook-portal-token/get-webhook-portal-token.usecase';

// Define the custom provider for the Svix client
const svixProvider: Provider = {
  provide: 'SVIX_CLIENT', // The injection token used in the use case
  useFactory: () => {
    const apiKey = process.env.SVIX_API_KEY;
    if (!apiKey) {
      throw new Error('SVIX_API_KEY environment variable is not set.');
    }

    return new Svix(apiKey || '');
  },
};

@Module({
  imports: [SharedModule],
  controllers: [WebhooksController],
  providers: [
    GetWebhookPortalTokenUsecase,
    svixProvider, // Add the Svix client provider
  ],
  exports: [],
})
export class WebhooksModule {}
