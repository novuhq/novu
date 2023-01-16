import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { QueueService } from './queue';
import { SubscriberOnlineService } from './subscriber-online';

const PROVIDERS = [
  {
    provide: QueueService,
    useFactory: () => {
      return new QueueService();
    },
  },
  SubscriberOnlineService,
];

@Module({
  imports: [
    JwtModule.register({
      secretOrKeyProvider: () => process.env.JWT_SECRET as string,
      signOptions: {
        expiresIn: 360000,
      },
    }),
  ],
  providers: [...PROVIDERS],
  exports: [...PROVIDERS, JwtModule],
})
export class SharedModule {}
