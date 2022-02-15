import { SetMetadata } from '@nestjs/common';

// eslint-disable-next-line @typescript-eslint/naming-convention
export const SubscriberRoute = () => SetMetadata('subscriberRouteGuard', true);
