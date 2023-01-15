import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { QueueService } from './queue';

const PROVIDERS = [
  {
    provide: QueueService,
    useFactory: () => {
      return new QueueService();
    },
  },
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
