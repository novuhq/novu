import { SetMetadata } from '@nestjs/common';

export const SubscriberRoute = () => SetMetadata('subscriberRouteGuard', true);
