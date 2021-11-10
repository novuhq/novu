import { Module } from '@nestjs/common';
import { SharedModule } from '../shared/shared.module';
import { UsersController } from './entities/users/users.controller';
import { UsersService } from './entities/users/users.service';

@Module({
  imports: [SharedModule],
  controllers: [UsersController],
  providers: [UsersService],
})
export class AdminModule {}
